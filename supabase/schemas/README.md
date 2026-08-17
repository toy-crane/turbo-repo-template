# 선언형 스키마

이 디렉터리의 `.sql` 파일이 데이터베이스 구조의 원본입니다. 원하는 최종
상태를 여기에 적고, 마이그레이션은 `supabase db diff -f <descriptive-name>`으로
생성합니다. 마이그레이션 파일을 먼저 손으로 쓰지 마세요.

## 실행 순서

`supabase/config.toml`의 `[db.migrations] schema_paths`가 `./schemas/*.sql`을
읽고, 파일은 이름의 사전순으로 실행합니다. 순서를 이름만으로 읽을 수 있도록 두 자리
숫자 접두사를 사용합니다.

```text
10-extensions.sql
20-username-rules.sql
30-tables.sql
50-functions.sql
60-policies.sql
```

번호는 자리를 나눌 뿐이고 빈 번호를 채우지 않습니다. 새 파일은 자기가 만드는
객체가 무엇에 기대는지를 보고 번호를 고릅니다. `20-username-rules.sql`이 함수인데도
30번대 앞에 있는 이유가 이것입니다. `public.profiles`의 check 제약이 이 함수를
부르므로 테이블보다 먼저 있어야 합니다.

사전순 위치보다 먼저 실행해야 하는 파일이 생기면 `schema_paths`의 glob 위에 그
파일 경로를 명시적으로 추가하세요.

## 새 테이블을 추가할 때: 기본 권한

이 데이터베이스의 기본 권한은 `public`의 새 테이블마다 `anon`,
`authenticated`, `service_role`에 `REFERENCES`·`TRIGGER`·`TRUNCATE`를 줍니다.
RLS는 `TRUNCATE`를 막지 않습니다.

스키마 파일에 `revoke all ... from anon, authenticated, service_role`을 적어도
**생성된 마이그레이션에는 그 REVOKE가 들어가지 않습니다.** 기본 권한은
`CREATE TABLE`이 실행될 때 적용되어 스키마 차이로 나타나지 않기 때문입니다.

그러므로 새 테이블마다 생성된 마이그레이션의 `GRANT` 앞에 `REVOKE`를 직접 넣고,
`db:reset` 뒤에 실제 권한을 확인하세요.

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = '<table>' and grantee in ('anon','authenticated');
```

`supabase/migrations/20260809060236_create_profiles.sql`이 이 보정의 예입니다.
같은 마이그레이션은 기존 `auth.users` 행의 누락된 프로필을 채우는 DML도 손으로 넣었습니다.
선언형 diff는 구조만 표현하므로 이런 보충 데이터는 항상 직접 추가해야 합니다.

## 이 디렉터리에 두지 않는 것

- DML, backfill, seed 데이터: `supabase/seed.sql` 또는 별도 버전 관리 마이그레이션
- 선언형 diff가 표현하지 못하는 객체: 생성된 마이그레이션에 수동으로 보완

자세한 절차는 저장소 루트 `README.md`의 "Supabase 스키마 변경" 절을
따르세요.
