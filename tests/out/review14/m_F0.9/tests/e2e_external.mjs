// 다른 네트워크 참가 시험: 이 PC 브라우저 2개 + GitHub 클라우드 PC 브라우저 1개가 같은 방에서 레이스
// 사용법: node tests/e2e_external.mjs [트랙] [랩]
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
const [track = 'mountain', laps = '1'] = process.argv.slice(2);
const ROOM = 'X' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'Q');
console.log('방', ROOM);
execSync(`gh workflow run external.yml --repo kkm9471/race3d -f room=${ROOM}`, { stdio: 'inherit' });
await new Promise(r => setTimeout(r, 6000));
const runId = JSON.parse(execSync('gh run list --repo kkm9471/race3d --workflow external.yml --limit 1 --json databaseId').toString())[0].databaseId;
console.log('원격 실행 번호', runId);
// 이 PC 두 명 (방장은 3명이 모이면 출발)
const env = { ...process.env, BASE: 'https://kkm9471.github.io/race3d/', WS: '', NPLAYERS: '3', ROOM, ONLY2: '1' };
const child = spawn(process.execPath, ['tests/e2e3.mjs', track, laps], { env, stdio: 'inherit' });
const code = await new Promise(r => child.on('exit', r));
console.log('로컬 시험 종료 코드', code);
execSync(`gh run watch ${runId} --repo kkm9471/race3d --exit-status`, { stdio: 'ignore' });
fs.rmSync('tests/out/remote', { recursive: true, force: true });
execSync(`gh run download ${runId} --repo kkm9471/race3d -n remote-result -D tests/out/remote`);
const remote = JSON.parse(fs.readFileSync('tests/out/remote/remote_result.json', 'utf8'));
const local = JSON.parse(fs.readFileSync('tests/out/e2e_last.json', 'utf8'));
let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };
ok(remote.ok, `원격(IP ${remote.res?.ip}, 그래픽 ${remote.res?.gpu}) 완주 화면까지`);
const fmt = rs => rs.map(x => `${x.name}:${x.fin}`).join(' ');
ok(remote.ok && fmt(remote.res.res) === fmt(local[0].res), `원격과 이 PC의 결과 동일: ${remote.ok ? fmt(remote.res.res) : '-'}`);
const keys = Object.keys(local[0].sent).filter(k => remote.res?.sent?.[k] !== undefined);
const same = keys.filter(k => remote.res.sent[k] === local[0].sent[k]);
ok(keys.length > 5 && same.length === keys.length, `상태 해시 ${keys.length}개 시점 원격·로컬 일치 (${same.length})`);
fs.writeFileSync('tests/out/e2e_external.md', `# 외부 네트워크 참가 시험 (${new Date().toISOString()})\n방 ${ROOM}, ${track} ${laps}랩\n원격 IP ${remote.res?.ip}, 원격 핑 ${Math.round(remote.res?.rtt || 0)}ms\n결과: ${remote.ok ? fmt(remote.res.res) : '실패'}\n해시 일치 ${same.length}/${keys.length}\n`);
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
