-- Podpora pro import turnajů z Ravensburger PlayHubu (viz CLAUDE.md):
-- u turnajů/prerelease bereme obsazenost a cenu z PlayHubu místo vlastní
-- registrace, `capacity` zůstává celková kapacita, `spots_taken` je
-- poslední načtený snímek obsazenosti z PlayHubu.
alter table events
  add column if not exists price text,
  add column if not exists spots_taken int not null default 0;
