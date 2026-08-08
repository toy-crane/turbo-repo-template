# Declarative schemas

이 디렉터리의 `.sql` 파일이 데이터베이스 구조의 source of truth다. 원하는 최종
상태를 여기에 적고, migration은 `supabase db diff -f <descriptive-name>`으로
생성한다. migration 파일을 먼저 손으로 쓰지 않는다.

## 실행 순서

`supabase/config.toml`의 `[db.migrations] schema_paths`가 `./schemas/*.sql`을
읽고, 파일은 이름의 사전순으로 실행된다. 순서를 이름만으로 읽을 수 있도록 두 자리
숫자 접두사를 사용한다.

```text
10-extensions.sql
20-types.sql
30-tables.sql
40-views.sql
50-functions.sql
60-policies.sql
```

사전순 위치보다 먼저 실행해야 하는 파일이 생기면 `schema_paths`의 glob 위에 그
파일 경로를 명시적으로 추가한다.

## 이 디렉터리에 두지 않는 것

- DML, backfill, seed 데이터 — `supabase/seed.sql` 또는 별도 versioned migration
- declarative diff가 표현하지 못하는 객체 — 생성된 migration에 수동으로 보완

자세한 절차는 저장소 루트 `README.md`의 "Changing the Supabase schema" 절을
따른다.
