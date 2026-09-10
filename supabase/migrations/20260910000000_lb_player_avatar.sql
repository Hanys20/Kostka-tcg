-- KOSTKA TCG – žebříček ligy: profilový obrázek hráče
--
-- Obrázek se ukládá přímo jako `data:` URI (base64) do textového sloupce –
-- žádný Storage bucket, žádné veřejné URL, žádné RLS policy navíc. Admin ho
-- nastaví v /leaderboard/sprava, kde se v prohlížeči zmenší na 256 px
-- (JPEG/WebP), takže jde o jednotky až desítky kB na hráče. Server přesto
-- délku i formát validuje (viz src/pages/api/admin/leaderboard/players.ts).
--
-- Prázdný / žádný obrázek = NULL → žebříček vykreslí iniciálu jako dosud.

alter table lb_players add column if not exists avatar_url text;
