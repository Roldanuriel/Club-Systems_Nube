CREATE SCHEMA IF NOT EXISTS club_sync;
CREATE TABLE IF NOT EXISTS club_sync.settings(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), node integer NOT NULL CHECK(node IN (1,2)), seed text NOT NULL);
CREATE TABLE IF NOT EXISTS club_sync.journal(id bigserial PRIMARY KEY, tx bigint NOT NULL, tab text NOT NULL, pk jsonb NOT NULL, before_row jsonb, after_row jsonb);
CREATE TABLE IF NOT EXISTS club_sync.cursor(peer integer PRIMARY KEY, position bigint NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS club_sync.conflict(peer integer PRIMARY KEY, payload jsonb NOT NULL, local_snapshot jsonb NOT NULL DEFAULT '[]', reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION club_sync.lock_write() RETURNS trigger LANGUAGE plpgsql SET timezone TO 'UTC' AS $$
BEGIN
 IF current_setting('club_sync.applying',true) IS DISTINCT FROM 'on' THEN PERFORM pg_advisory_xact_lock(43422001); END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION club_sync.capture() RETURNS trigger LANGUAGE plpgsql SET timezone TO 'UTC' AS $$
DECLARE k jsonb; oldj jsonb; newj jsonb;
BEGIN
 IF current_setting('club_sync.applying',true) = 'on' THEN RETURN NULL; END IF;
 IF TG_OP <> 'INSERT' THEN oldj=to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN newj=to_jsonb(NEW); END IF;
 IF oldj IS NOT DISTINCT FROM newj THEN RETURN NULL; END IF;
 SELECT jsonb_object_agg(a.attname,COALESCE(newj,oldj)->a.attname) INTO k
 FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
 WHERE i.indrelid=TG_RELID AND i.indisprimary;
 INSERT INTO club_sync.journal(tx,tab,pk,before_row,after_row) VALUES(txid_current(),TG_TABLE_NAME,k,oldj,newj);
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION club_sync.reject_truncate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TRUNCATE no está permitido con sincronización activa; usa operaciones registradas.'; END $$;
