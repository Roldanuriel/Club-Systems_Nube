import fs from 'node:fs'
import mysql from 'mysql2/promise'

const csvPath = process.argv[2]
if (!csvPath) throw new Error('Indica la ruta del CSV')

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]
  }))
}

function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index++ } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\r' || char === '\n') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function timestamp(value) {
  const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  return match ? new Date(+match[3], +match[2] - 1, +match[1], +match[4], +match[5], +(match[6] || 0)).getTime() : Number.MAX_SAFE_INTEGER
}

const env = parseEnv(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8'))
const rows = parseCSV(fs.readFileSync(csvPath, 'utf8')).filter(row => row.some(cell => String(cell).trim()))
const headers = rows.shift()
const normalizedHeaders = headers.map(normalize)
const find = pattern => normalizedHeaders.findIndex(header => pattern.test(header))
const indexes = {
  date: find(/marca temporal|fecha.*registro/), name: find(/nombre completo/), phone: find(/telef|celular/),
  control: find(/numero.*control|matricula/), semester: find(/semestre/), career: find(/carrera/),
  option1: find(/primera.*opcion.*club/), option2: find(/segunda.*opcion.*club/), option3: find(/tercera.*opcion.*club/)
}

function splitName(value) {
  const separated = String(value || '').trim().replace(/([\p{Ll}\p{M}])([\p{Lu}])/gu, '$1 $2')
  const parts = separated.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null
  if (parts.length === 2) return { apellidoP: parts[0], apellidoM: '', nombre: parts[1] }
  return { apellidoP: parts[0], apellidoM: parts[1], nombre: parts.slice(2).join(' ') }
}

const firstByControl = new Map()
for (const row of rows) {
  const control = String(row[indexes.control] || '').replace(/\D/g, '')
  if (!/^\d{8}$/.test(control)) continue
  const candidate = { row, order: timestamp(row[indexes.date]) }
  if (!firstByControl.has(control) || candidate.order < firstByControl.get(control).order) firstByControl.set(control, candidate)
}

const connection = await mysql.createConnection({
  host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), user: env.DB_USER,
  password: env.DB_PASSWORD, database: env.DB_NAME, charset: 'utf8mb4'
})
const [careers] = await connection.query('SELECT id, nombre FROM carreras')
const careerMap = new Map(careers.map(career => [normalize(career.nombre), Number(career.id)]))
const [periods] = await connection.query("SELECT id FROM periodos WHERE estado = 'ACTIVO' ORDER BY id DESC LIMIT 1")
if (!periods[0]) throw new Error('No hay periodo activo')

let updated = 0
let radioAssigned = 0
let skippedName = 0; let skippedData = 0; let missingCareer = 0; let missingSemester = 0; let missingPhone = 0
await connection.beginTransaction()
try {
  await connection.query('INSERT IGNORE INTO semestres (id, numero) VALUES (8,8),(9,9),(10,10),(11,11)')
  for (const [control, item] of firstByControl) {
    const row = item.row
    const parsedName = splitName(row[indexes.name])
    if (!parsedName) { skippedName++; continue }
    const { apellidoP, apellidoM, nombre } = parsedName
    const phone = String(row[indexes.phone] || '').replace(/\D/g, '')
    const semester = Number.parseInt(String(row[indexes.semester] || '').match(/\d+/)?.[0] || '', 10)
    const careerId = careerMap.get(normalize(row[indexes.career]))
    if (!careerId || !semester || phone.length < 7) {
      skippedData++; if (!careerId) missingCareer++; if (!semester) missingSemester++; if (phone.length < 7) missingPhone++; continue
    }
    const [result] = await connection.execute(
      `UPDATE alumnos SET nombre=?, apellidoP=?, apellidoM=?, telefono=?, carrera_id=?, semestre_id=?, opcion_1=?, opcion_2=?, opcion_3=?
       WHERE numeroControl=? AND periodo_id=?`,
      [nombre, apellidoP, apellidoM, phone, careerId, semester, row[indexes.option1] || null, row[indexes.option2] || null, row[indexes.option3] || null, control, periods[0].id]
    )
    updated += result.affectedRows
  }

  const [radioRows] = await connection.query("SELECT id, cupo_limite FROM clubs WHERE LOWER(nombre) = 'radio' LIMIT 1")
  if (radioRows[0]) {
    const radioCandidates = [...firstByControl.entries()]
      .filter(([, item]) => /(^| )radio($| )/.test(normalize(item.row[indexes.option1])))
      .sort((a, b) => a[1].order - b[1].order)
    for (const [control, item] of radioCandidates) {
      const row = item.row
      const parsedName = splitName(row[indexes.name])
      const phone = String(row[indexes.phone] || '').replace(/\D/g, '')
      const semester = Number.parseInt(String(row[indexes.semester] || '').match(/\d+/)?.[0] || '', 10)
      const careerId = careerMap.get(normalize(row[indexes.career]))
      if (!parsedName || !careerId || !semester || phone.length < 7) continue
      const [existing] = await connection.execute('SELECT id, id_club FROM alumnos WHERE numeroControl=? AND periodo_id=? LIMIT 1', [control, periods[0].id])
      if (existing[0]) {
        if (Number(existing[0].id_club) !== Number(radioRows[0].id)) {
          await connection.execute('UPDATE alumnos SET id_club=?, opcion_1=?, opcion_2=?, opcion_3=? WHERE id=?', [radioRows[0].id, row[indexes.option1] || null, row[indexes.option2] || null, row[indexes.option3] || null, existing[0].id])
          radioAssigned++
        }
        continue
      }
      const [occupied] = await connection.execute("SELECT COUNT(*) total FROM alumnos WHERE id_club=? AND periodo_id=? AND estado_periodo='ACTIVO'", [radioRows[0].id, periods[0].id])
      if (Number(occupied[0].total) >= Number(radioRows[0].cupo_limite || 30)) break
      await connection.execute(
        `INSERT INTO alumnos (nombre, apellidoP, apellidoM, numeroControl, telefono, carrera_id, semestre_id, id_club, periodo_id, estado_periodo, opcion_1, opcion_2, opcion_3)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, ?)`,
        [parsedName.nombre, parsedName.apellidoP, parsedName.apellidoM, control, phone, careerId, semester, radioRows[0].id, periods[0].id, row[indexes.option1] || null, row[indexes.option2] || null, row[indexes.option3] || null]
      )
      radioAssigned++
    }
  }
  await connection.commit()
} catch (error) {
  await connection.rollback(); throw error
} finally {
  await connection.end()
}

console.log(`Alumnos corregidos: ${updated}; asignados a Radio: ${radioAssigned}; nombres omitidos: ${skippedName}; datos omitidos: ${skippedData} (carrera ${missingCareer}, semestre ${missingSemester}, teléfono ${missingPhone})`)
