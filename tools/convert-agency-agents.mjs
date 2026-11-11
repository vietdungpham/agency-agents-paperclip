import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

if (process.argv[2] === '--package-only') {
  if (!process.argv[3] || !process.argv[4]) throw new Error('Usage: node convert-agency-agents.mjs --package-only <package-directory> <output.zip>');
  await createZip(path.resolve(process.argv[3]), path.resolve(process.argv[4]));
  console.log('Package archive created');
  process.exit(0);
}

const [sourceArg, outputArg, commit, archiveArg] = process.argv.slice(2);
if (!sourceArg || !outputArg || !/^[a-f0-9]{40}$/.test(commit ?? '')) {
  throw new Error('Usage: node convert-agency-agents.mjs <source-checkout> <empty-output> <upstream-commit-sha> [output.zip]');
}
const source = path.resolve(sourceArg);
const output = path.resolve(outputArg);
if (output === source || output.startsWith(source + path.sep)) throw new Error('Output must be outside the source checkout');
await fs.mkdir(output, { recursive: true });
if ((await fs.readdir(output)).length) throw new Error('Output directory must be empty; use a new directory');
const repo = 'https://github.com/msitarzewski/agency-agents';
const license = await fs.readFile(path.join(source, 'LICENSE'));
if (!license.toString().startsWith('MIT License')) throw new Error('Upstream license changed; review before conversion');
const divisions = JSON.parse(await fs.readFile(path.join(source, 'divisions.json'), 'utf8')).divisions;
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const slash = p => p.split(path.sep).join('/');
const quote = s => JSON.stringify(s);
const isInside = (parent, child) => child === parent || child.startsWith(parent + path.sep);
const walk = async dir => {
  const result = [];
  for (const e of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (e.isSymbolicLink()) throw new Error(`Symlinks are not converted: ${e.name}`);
    const full = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...await walk(full));
    else if (e.isFile()) result.push(full);
  }
  return result;
};
const scalar = (header, field) => {
  const value = header.match(new RegExp(`^${field}:\\s*(.*)$`, 'm'))?.[1]?.trim();
  if (!value || /^[>|]/.test(value)) throw new Error(`Unsupported/missing upstream ${field}`);
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'")) {
    if (!value.endsWith("'")) throw new Error(`Invalid quoted ${field}`);
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
};
const catalog = [];
const warnings = [];
const seen = new Set();
for (const category of Object.keys(divisions).sort()) {
  for (const file of await walk(path.join(source, category))) {
    if (!file.endsWith('.md')) continue;
    const original = await fs.readFile(file);
    const text = original.toString('utf8');
    const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!header) throw new Error(`Expected role frontmatter: ${file}`);
    const title = scalar(header[1], 'name');
    const upstreamDescription = scalar(header[1], 'description');
    const relative = slash(path.relative(source, file));
    const name = 'agency-' + slash(path.relative(path.join(source, category), file)).replace(/\.md$/, '').replace(/\//g, '-').toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 63 || seen.has(name)) throw new Error(`Invalid or duplicate name: ${name}`);
    seen.add(name);
    const description = `Use for assigned tasks requiring ${title} expertise. ${upstreamDescription}`.replace(/</g, ' less than ').replace(/>/g, ' greater than ');
    if (description.length > 1024) throw new Error(`Description too long: ${name}`);
    const rootRelative = `skills/${category}/${name}`;
    const root = path.join(output, rootRelative);
    const reference = `references/upstream/${relative}`;
    await fs.mkdir(path.dirname(path.join(root, reference)), { recursive: true });
    await fs.writeFile(path.join(root, reference), original);
    await fs.writeFile(path.join(root, 'LICENSE'), license);
    const copied = new Set([relative]);
    const copyDependencies = async (upstreamPath, body) => {
      // Ignore fenced examples: example links are not package dependencies.
      const prose = body.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, '');
      for (const link of prose.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
        let href = link[1];
        if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href) || href === 'link') continue;
        href = decodeURIComponent(href.split(/[?#]/)[0]);
        if (!href) continue;
        const resolved = path.resolve(source, path.dirname(upstreamPath), href);
        if (!isInside(source, resolved)) { warnings.push({ source: relative, target: link[1], kind: 'outside-upstream-root' }); continue; }
        const rel = slash(path.relative(source, resolved));
        const stat = await fs.lstat(resolved).catch(() => null);
        if (!stat?.isFile() || stat.isSymbolicLink()) { warnings.push({ source: relative, target: link[1], kind: 'unresolved-upstream-link' }); continue; }
        if (copied.has(rel)) continue;
        copied.add(rel);
        const bytes = await fs.readFile(resolved);
        const dest = path.join(root, 'references/upstream', rel);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, bytes);
        if (resolved.endsWith('.md')) await copyDependencies(rel, bytes.toString('utf8'));
      }
    };
    await copyDependencies(relative, text);
    const sourceUrl = `${repo}/blob/${commit}/${relative}`;
    const skill = `---\nname: ${name}\ndescription: ${quote(description)}\nlicense: MIT\nmetadata:\n  upstream_repo: ${quote(repo)}\n  upstream_commit: ${quote(commit)}\n  upstream_path: ${quote(relative)}\n  upstream_title: ${quote(title)}\n  upstream_sha256: ${quote(sha256(original))}\n  category: ${quote(category)}\n---\n\n# ${title}\n\nApply this specialist role to the current assigned task. Read [the original role instructions](${reference}) before performing the specialist work; the reference preserves the upstream file verbatim, including its examples, workflows, and deliverables.\n\n## Using this role in Paperclip\n\n- Keep the assigned agent's identity, reporting line, task scope, and existing Paperclip workflow. This skill supplies domain guidance rather than creating a new employee or manager.\n- Treat upstream personality, experience, memory, and success-metric statements as role guidance or targets, not evidence of actual remembered work or achieved results. Use recorded task context and stored memory for factual claims.\n- Upstream tools, services, models, and commands are not installed or granted by importing this skill. Use available authorized tools and report missing dependencies when they prevent the assigned work.\n- Keep job-specific research, files, and results with the current task/workspace; use shared agent memory only for relevant reusable knowledge.\n\n## Source\n\nAdapted from [Agency Agents: ${title}](${sourceUrl}), division **${divisions[category].label}**, pinned at commit \`${commit}\`. Original content is MIT-licensed; see [LICENSE](LICENSE).\n`;
    await fs.writeFile(path.join(root, 'SKILL.md'), skill);
    catalog.push({ name, title, category, description, upstreamDescription, entry: `${rootRelative}/SKILL.md`, sourcePath: relative, sourceUrl, upstreamSha256: sha256(original), reference: `${rootRelative}/${reference}`, supportingFiles: [...copied].filter(p => p !== relative) });
  }
}
const counts = Object.fromEntries(Object.keys(divisions).sort().map(k => [k, catalog.filter(s => s.category === k).length]));
await fs.writeFile(path.join(output, 'LICENSE'), license);
await fs.writeFile(path.join(output, 'paperclip.skills.json'), JSON.stringify({ version: 1, skills: catalog.map(s => s.entry), requirements: 'Role instructions only. Tools, credentials, dependencies and agent hiring/reporting are configured separately in the target runtime and Paperclip.' }, null, 2) + '\n');
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify({ upstream: { repo, commit }, count: catalog.length, categories: counts, skills: catalog }, null, 2) + '\n');
await fs.writeFile(path.join(output, 'conversion-report.json'), JSON.stringify({ upstreamCommit: commit, rolesFound: catalog.length, skillsCreated: catalog.length, originalContentPreserved: true, warnings }, null, 2) + '\n');
const escapeCell = s => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
await fs.writeFile(path.join(output, 'CATALOG.md'), '# Agency Agents — Paperclip skills\n\n| Nhóm | Vai trò | Skill |\n|---|---|---|\n' + catalog.map(s => `| ${s.category} | ${escapeCell(s.title)} | [${s.name}](${s.entry}) |`).join('\n') + '\n');
await fs.mkdir(path.join(output, 'tools'), { recursive: true });
await fs.copyFile(new URL(import.meta.url), path.join(output, 'tools/convert-agency-agents.mjs'));
await fs.writeFile(path.join(output, 'README.md'), `# Agency Agents cho Paperclip\n\nBộ chuyển đổi gồm **${catalog.length} skill thuộc ${Object.keys(counts).length} nhóm**, từ [msitarzewski/agency-agents](${repo}) tại commit [${commit}](${repo}/commit/${commit}). Nội dung chuyên môn giữ tiếng Anh như nguồn gốc.\n\n## Import vào Paperclip\n\n1. Giải nén toàn bộ gói vào một project workspace đã đăng ký trên máy chạy Paperclip. Không chỉ copy riêng các file SKILL.md: cần giữ references và LICENSE.\n2. Vào **Skills → New → Import from path or URL**, nhập đường dẫn tới thư mục skills/ của gói; hoặc dùng **Import skills from project** để quét workspace.\n3. Chọn các skill cần dùng và gán cho agent sau khi import. Import không tự tạo agent, thiết lập Reports to, cài plugin, kết nối công cụ hay cấp quyền.\n4. Thử một task đại diện cho từng vai trò trước khi dùng vào công việc thực tế.\n\nĐường dẫn local phải nằm trong workspace hoặc vùng lưu trữ mà Paperclip cho phép. Nếu Paperclip chạy trên VPS, đường dẫn phải là đường dẫn trên VPS.\n\nCó thể đưa nguyên thư mục gói lên một repository GitHub rồi import URL repository hoặc thư mục skill tương ứng. paperclip.skills.json khai báo các entrypoint theo định dạng manifest được tài liệu Paperclip mô tả.\n\nCLI tương đương:\n\n\x60\x60\x60sh\npaperclipai skills import /path/to/agency-agents-paperclip/skills --company-id YOUR_COMPANY_ID\n\x60\x60\x60\n\n## Cấu trúc\n\n\x60\x60\x60text\nskills/<nhóm>/agency-<tên-gốc>/\n  SKILL.md\n  LICENSE\n  references/upstream/<đường-dẫn-vai-trò-gốc>.md\n\x60\x60\x60\n\nSKILL.md có name dạng kebab-case, description để định tuyến, giấy phép và metadata nguồn. File tham chiếu giữ nguyên từng byte của vai trò gốc. Các tài nguyên được liên kết tương đối và tồn tại trong nguồn sẽ được đóng gói kèm, giữ đường dẫn tương đối. Các liên kết gốc không giải được được ghi trong conversion-report.json.\n\n## Những gì đã thay đổi\n\n- Chuyển từng định nghĩa vai trò thành một skill riêng có tiền tố agency- để giảm trùng tên.\n- Thêm mô tả dùng khi task cần chuyên môn tương ứng.\n- Giữ phần hướng dẫn dài trong references để chỉ nạp khi dùng.\n- Thêm hướng dẫn áp dụng vai trò trong phạm vi agent/task hiện có; không coi lời mô tả memory hoặc kinh nghiệm trong persona là dữ kiện thực tế.\n- Giữ giấy phép MIT ở cấp gói và từng skill để hỗ trợ import riêng lẻ.\n- Không chạy script hay lệnh cài đặt từ upstream. Thuộc tính tools/services ở frontmatter gốc được giữ trong tham chiếu, không tự chuyển thành quyền thực thi.\n\n## Tra cứu và giới hạn\n\n- [Danh mục đọc nhanh](CATALOG.md); catalog.json có mô tả, nguồn và SHA-256 của từng file gốc.\n- conversion-report.json ghi cảnh báo nguồn; validation-report.json ghi kết quả kiểm tra cấu trúc và toàn vẹn.\n- Đây là chuyển đổi định dạng và đóng gói, không phải đánh giá chất lượng nghiệp vụ của 283 vai trò, và chưa import thử vào một instance Paperclip đang chạy.\n- Các agent có chức năng tự spawn/delegate trong nội dung nguồn vẫn cần runtime và quyền tương ứng; chúng không tự trở thành nhân viên Paperclip.\n- Chọn một số skill sát vai trò mỗi agent thay vì gán toàn bộ bộ sưu tập.\n\n## Chạy lại bộ chuyển đổi\n\nYêu cầu Node.js có các module chuẩn; không cần npm install. Từ một checkout/snapshot Agency Agents:\n\n\x60\x60\x60sh\nnode tools/convert-agency-agents.mjs /path/to/agency-agents /path/to/new-empty-output ${commit} /path/to/output.zip\n\x60\x60\x60\n\nThư mục đầu ra phải trống. Script không sửa nguồn và không ghi đè một gói đã tồn tại. Khi cập nhật nguồn, truyền SHA đúng của commit tương ứng và xem lại LICENSE trước khi phân phối.\n\n## Nguồn định dạng\n\n- [Paperclip Skills Reference](https://docs.paperclip.ing/reference/skills/)\n- [Paperclip Skills guide](https://docs.paperclip.ing/guides/org/skills/)\n- [Agency Agents upstream](${repo})\n`);

export async function createZip(root, target) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[i] = c >>> 0; }
  const crc32 = b => { let c = 0xffffffff; for (const v of b) c = table[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const locals = [], central = []; let offset = 0;
  const listFiles = async dir => {
    const items = [];
    for (const e of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (e.isSymbolicLink()) throw new Error('Symlinks are not packaged');
      const p = path.join(dir, e.name);
      if (e.isDirectory()) items.push(...await listFiles(p));
      else if (e.isFile()) items.push(p);
    }
    return items;
  };
  const files = await listFiles(root);
  if (files.length >= 65535) throw new Error('ZIP64 is not implemented');
  for (const file of files) {
    const bytes = await fs.readFile(file), compressed = zlib.deflateRawSync(bytes), crc = crc32(bytes);
    const name = Buffer.from(path.basename(root) + '/' + path.relative(root, file).split(path.sep).join('/'));
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8); local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(name.length, 26);
    const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x800, 8); cd.writeUInt16LE(8, 10); cd.writeUInt16LE(33, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(compressed.length, 20); cd.writeUInt32LE(bytes.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(offset, 42);
    locals.push(local, name, compressed); central.push(cd, name); offset += local.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  await fs.writeFile(target, Buffer.concat([...locals, directory, end]));
}
if (archiveArg) await createZip(output, path.resolve(archiveArg));
console.log(JSON.stringify({ count: catalog.length, categories: counts, warnings, output, archive: archiveArg ?? null }));
