---
title: "Tối ưu hóa Skill"
sidebar_label: Tối ưu hóa Skill
description: Cách dùng oma skill optimize để phát triển skill bền vững dựa trên bằng chứng, với train, validation và runner-owned holdout gate xác định.
---

# Tối ưu hóa Skill {#skill-optimization}

`oma skill optimize` tiến hóa `SKILL.md` của một skill để tối đa hóa `utilityLift` đo được do `oma skill eval` tạo ra. Nó tách raw rollout evidence, persistent scoped knowledge và executable skill. Wiki Maintainer tổng hợp success/failure có thể quan sát; Proposer dùng knowledge đó để tạo các edit add/delete/replace có phạm vi. Candidate phải cải thiện utility trên training hoặc validation mà không làm regress split nào trong hai split, với các phép đo task và negative-transfer đầy đủ. `--apply` còn yêu cầu một final test do runner sở hữu được đo đầy đủ và không regress, cùng live isolation đã được xác minh. Khi deploy không có wiki lookup bổ sung ở thời điểm inference: output vẫn là một `SKILL.md`.

Cơ sở nghiên cứu: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C. & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

CLI optimization hiện yêu cầu `--live` và phát sinh model call. Luồng mặc định/không live và `--mock` không thể tạo hay replay proposal vì chưa có recorded-proposal loader; chúng dừng trước khi evaluation. Dùng `oma skill eval --mock` để replay offline. Các API optimizer/scorer được inject vẫn dùng được cho offline test. Truyền cả `--live` và `--mock` là lỗi.

---

## Dependency cứng: eval task fixture {#hard-dependency-eval-task-fixtures}

`oma skill optimize` không thể chạy nếu thiếu eval task fixture. Nó cần ít nhất **5 task fixture** (`MIN_TASKS = 5`) trong `.agents/eval/<skill>/`. Nếu tìm thấy ít hơn, command báo lỗi ngay:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

Xem [Hướng dẫn Skill Utility Eval](/docs/guide/skill-eval) về quy ước directory `.agents/eval/<skill>/`, fixture schema, checker type và cách seed rollout cho mock replay.

Việc thăng cấp cũng yêu cầu một tập không rỗng các neighbor task cùng domain thuộc skill khác. Mọi validation score của candidate và final score của candidate phải đo các neighbor của split được đánh giá với đúng candidate body. Neighbor bị thiếu hay recording ghép cặp không đầy đủ không thể xác lập rằng không có negative transfer. Offline evaluation chỉ có thể replay các candidate recording khớp; hãy dùng live optimization để tạo và đánh giá candidate mới.

Replay và suite-scoped knowledge gắn với toàn bộ task/evaluator contract, gồm cả default judge rubric hiệu lực và scorer protocol revision. Các recording cũ và knowledge scope trước đó cần evidence mới sau lần nâng cấp provenance này; gắn lại hash mới lên score cũ không xác lập một phép đo hợp lệ.

---

## Cách hoạt động {#how-it-works}

Fixture được sort theo task ID và tách xác định thành tập **train**, **held-out validation** và **runner-owned final-test**. Với ít nhất năm fixture, tỷ lệ mục tiêu là 60/20/20 và mỗi partition có ít nhất một task. Ví dụ, tám fixture tạo ra bốn task train, một task validation và ba task final-test sau khi làm tròn. Các fixture khai báo cùng một `group` được gán cùng nhau, nên một bản diễn đạt lại không thể nằm ở train trong khi bản gốc nằm ở final test; với ít hơn ba group, split quay về dùng task ID và đưa ra cảnh báo. Task final-test đến từ local fixture set này và được giữ khỏi Maintainer và Proposer. Task ID final-test trùng lặp và việc chồng lấn với một development split bị từ chối.

Với mỗi epoch (tối đa `--max-epochs`, mặc định 8):

1. **Chấm `SKILL.md` tốt nhất hiện tại trên TRAIN split** — `oma skill eval` trả prompt, output và lift theo task có thể quan sát. Mọi task trong một internal split phải có cả hai arm được chấm; so sánh thất bại hoặc thiếu không thể làm giảm mẫu số.
2. **Wiki Maintainer tổng hợp evidence** — tối đa năm failure và ba success trở thành pattern có liên kết evidence. Failure được chọn theo giá trị học được: regression trước, sau đó đến các failure chung sâu nhất; task mà cả hai arm đã pass bị loại vì chúng không cho biết gì về edit tiếp theo. Success được xếp hạng theo lift. Pattern có phạm vi và kết quả gate trước đó được recall từ hệ thống memory L1/L2/L3 của OMA.
3. **Proposer tạo K candidate edit** (tối đa `--edits-per-epoch`, mặc định 4). Exact edit đã có trong persistent rejection history bị bỏ qua.
4. **Với mỗi candidate edit:**
   - Áp edit lên bản copy `SKILL.md` trong memory.
   - Validate candidate (frontmatter `name`/`description` phải còn; body phải parse).
   - Ép textual learning-rate budget: bỏ edit có net character change vượt `--lr` (mặc định 600 ký tự).
   - Chấm lại mọi task trong **held-out validation split** (kèm so sánh baseline/candidate ghép cặp trên neighbor task) và mọi task trong **held-in training split** (không so sánh neighbor).
5. **Chấp nhận candidate hợp lệ tốt nhất** theo quy tắc held-in/held-out: candidate không mất gì trên cả hai split (`Δval ≥ 0` và `Δtrain ≥ 0`) và tăng trên ít nhất một trong hai. Candidate được xếp hạng theo `Δval + Δtrain`. Không yêu cầu validation tăng nghiêm ngặt, vì một body đã pass mọi validation task vẫn có thể được sửa trên một training failure mà không làm mất kết quả held-out đã đạt; final test quyết định việc sửa đó có generalize hay không. Task coverage phải đầy đủ, mẫu negative-transfer không rỗng phải được đo đầy đủ, và không neighbor nào được có confirmed regression bằng hoặc thấp hơn `NEG_TRANSFER_FAIL = -0.1`. Trong live run, một neighbor regress ở lần so sánh ghép cặp đầu tiên được đo lại một lần; delta được ghi là trung bình của cả hai lần so sánh, và chỉ một regression tái lập được (`confirmed: true`) mới từ chối candidate. Mock replay không thể đo lại, nên một regression ở single-trial vẫn có hiệu lực. Live report phải khai báo `isolation: "enforced"`. Kết quả proposal gate được ghi cùng `deltaLift` (validation), `deltaTrainLift` và các neighbor delta đằng sau verdict.
6. **Dừng sớm** sau 2 epoch liên tiếp không có edit được chấp nhận (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Chạy final test do runner sở hữu sau evolution.** Cả body gốc lẫn validation winner phải bao phủ mọi final-test task. Candidate không được mất final-test lift (`candidateLift >= baselineLift`; mức tăng mà nhờ đó nó được chấp nhận đã được chứng minh trên các development split, và một mức tăng nghiêm ngặt trên một frozen test nhỏ sẽ khiến hầu hết các bản sửa không thể thăng cấp) và phải pass thêm một negative-transfer check đầy đủ, riêng cho candidate. `finalTest.findings` liệt kê lift theo task của body gốc và của candidate, để một test thất bại có thể được đọc là regression thật hoặc chỉ là một task nhiễu. Final test bị thiếu, không đầy đủ hoặc thất bại sẽ ngăn việc thăng cấp. Các final failure đã đo vẫn là audit record và không trở thành rejection knowledge cho các lần optimization sau.

Optimizer làm việc trên candidate copy trong memory trong suốt loop.

Candidate chưa được đo được ghi là `inconclusive`, với các lý do như `insufficient-coverage`, `negative-transfer-unmeasured` hoặc `unverified-isolation`. Chúng bị loại khỏi learned rejection history và vẫn đủ điều kiện để thử lại sau khi các điều kiện đánh giá được sửa. Một confirmed neighbor regression, một mức giảm trên một trong hai split (`split-regression`), hoặc không có cải thiện trên bất kỳ split nào (`no-validation-lift`) là một rejection. Các diagnostic cho thấy evaluation chưa đầy đủ hoặc maintenance bị suy giảm sẽ chặn việc thăng cấp.

---

## Cách dùng {#usage}

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Flags {#flags}

| Flag | Mặc định | Mô tả |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Skill ID cần tối ưu (tên đơn giản, không có path separator). |
| `--dry-run` | **yes (default)** | Đề xuất edit và in diff mà không đổi `SKILL.md`; evidence tạo ra và evolution event vẫn được lưu. |
| `--apply` | — | Ghi candidate đã validate sau khi mọi promotion gate pass, gồm cả evidence final-test và negative-transfer đầy đủ; backup original trước atomic write. Skill do OMA sở hữu còn cần `--yes`. |
| `--mock` | Mặc định khi không live | CLI chưa triển khai proposal replay, nên luồng này dừng trước khi evaluation. Dùng `oma skill eval --mock` để replay evaluation offline. |
| `--live` | — | Bắt buộc cho CLI optimization hiện tại. Phát sinh model call thật; in cost preview và hỏi xác nhận trừ khi có `--yes`. |
| `--max-epochs <n>` | `8` | Số epoch tối ưu tối đa. |
| `--edits-per-epoch <k>` | `4` | Số candidate edit optimizer LLM đề xuất mỗi epoch. |
| `--lr <chars>` | `600` | Textual learning-rate budget: net character change tối đa cho mỗi edit được chấp nhận. |
| `--yes` | — | Bỏ qua cost-preview confirmation của live và xác nhận hành vi ghi đè khi áp dụng cho skill do OMA sở hữu. |
| `--json` | — | Xuất JSON cho CI/CD. |
| `--output <format>` | `text` | Output format (`text` hoặc `json`). |

---

## Ví dụ end-to-end tối thiểu {#minimal-end-to-end-example}

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Output minh họa cho tám fixture và một candidate pass mọi promotion gate:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

Diff cho biết optimizer sẽ ghi gì. `SKILL.md` không đổi, còn evolution evidence được tạo và scoped gate outcome được lưu cho các run sau.

---

## Áp dụng cải tiến đã validation {#applying-a-validated-improvement}

Khi hài lòng với proposed diff, chạy lại với `--apply`:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### Quy trình như một artifact {#the-procedure-as-an-artifact}

Các prompt của optimizer và maintainer chính là quy trình cải thiện. Chúng đi kèm dưới dạng mặc định tích hợp sẵn và có thể bị ghi đè bởi các file dưới `.agents/evolution/` (do người dùng sở hữu: không bao giờ bị install manifest copy và cũng không bị `oma update` xóa, khác với `.agents/eval/`):

| File | Vai trò | Placeholder bắt buộc |
|---|---|---|
| `optimizer.md` | Đề xuất các edit cho SKILL.md từ training evidence và persistent knowledge | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (cũng có `{{knowledge}}`) |
| `maintainer.md` | Tổng hợp evidence thành các pattern tái sử dụng được | `{{evidence}}`, `{{priorFacts}}` (cũng có `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Các bề mặt mà loop không bao giờ được ghi, những phần procedure nào một meta-optimization được phép thay đổi, các `anchors` ground-truth mặc định cho meta run, và một dispatch budget | phải tự liệt kê chính nó dưới `immutable` |

`budget.max_dispatches_per_run` (mặc định `null`, không giới hạn) được thực thi trong các live run: mỗi model call nền (task arm, neighbor arm, judge, optimizer, maintainer) tính một đơn vị, và call sẽ vượt quá giới hạn bị từ chối trước khi được thực hiện. Khi đó loop dừng với diagnostic `budget:exhausted`, final test bị bỏ qua, việc thăng cấp bị chặn, và kết quả báo `budget: { limit, used }`. Usage được ghi vào run summary trong cả hai trường hợp, nên các procedure có thể được so sánh theo chi phí cũng như theo gain.

`oma skill procedure` in ra các nguồn đang dùng và hash; `--export` ghi các mặc định ra để chỉnh sửa mà không ghi đè file hiện có. Một template bỏ mất placeholder bắt buộc sẽ bị từ chối thay vì bị suy giảm một cách âm thầm. Mỗi run ghi `procedure` (hash cho từng phần cộng một hash gộp) và `memory` trong kết quả, run summary và promotion lineage của nó, nên evidence tạo ra dưới một procedure không bao giờ bị nhầm với procedure khác.

Phản hồi của optimizer được đọc một cách khoan dung chỉ về mặt định dạng: code fence và dòng trống bị bỏ qua, nhưng bất kỳ dòng nội dung nào không phải một dòng `EDIT:` hợp lệ (hoặc một `NO_ACTION` đứng riêng) đều là `parse-error`, và diagnostic giờ bao gồm dòng vi phạm đầu tiên để có thể lần ra lỗi.

### Memory ablation và thống kê dài hạn {#memory-ablation-and-long-run-statistics}

`--memory none` bắt đầu một run từ knowledge rỗng (không có pattern được recall hay gate history) nhưng vẫn ghi lại nó. So sánh các run dưới `--memory recall` (mặc định) và `--memory none` ở cùng budget là phép thử xem persistent knowledge có giúp ích hay không; một tuyên bố rằng loop học từ kinh nghiệm cần phép so sánh đó, chứ không phải sự hiện diện của một memory.

`oma skill evolution-stats --skill <id>` tổng hợp mọi run đã ghi của một skill từ `.agents/results/skill-evolution/<id>/*.jsonl`: số run theo status, các proposal theo gate outcome và acceptance rate, các cải thiện đã xác minh (final test pass và đủ điều kiện thăng cấp), số lần apply và rollback, final lift trung bình, số model call trên các run có đo và số call cho mỗi cải thiện đã xác minh (chi phí của quá trình chứ không phải của một run), cùng các số liệu đó chia theo memory mode và theo procedure hash. Báo cáo meta-optimization cho thấy số call trung bình cho mỗi inner run của procedure hiện tại và từng candidate, nên một procedure thắng về gain bằng cách tiêu tốn nhiều hơn sẽ hiện rõ là như vậy.

### Meta-optimization: quy trình là candidate {#meta-optimization-the-procedure-as-the-candidate}

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` coi prompt của optimizer (hoặc maintainer) là đối tượng đang được thử nghiệm. Nó chạy inner loop (`oma skill optimize --dry-run`) trên từng held-out skill được nêu tên, `--repeats` lần, dưới procedure hiện tại; yêu cầu một proposer đưa ra tối đa `--candidates` edit nhỏ cho template; chạy lại inner loop dưới từng candidate với cùng budget `--max-epochs` và `--edits-per-epoch`; và so sánh từng candidate với procedure hiện tại theo từng cặp (skill, repeat) trên tổng training-lift và validation-lift gain mà inner loop đạt được.

Một candidate chỉ được thăng cấp khi khoảng bootstrap 95% ghép cặp của chênh lệch gain nằm trên không (có seed, 1000 lần resample), tồn tại ít nhất ba cặp, và không skill nào đã cải thiện dưới procedure hiện tại mất quá một nửa gain đó dưới candidate. Một inner run có evaluation bị chặn (insufficient coverage, unverified isolation, budget cạn) được báo là failed và bị loại khỏi các cặp, nên một lần gián đoạn không thể được tính là zero gain cho một arm. Held-out skill phải còn headroom: một skill mà body hiện tại đã đạt điểm hoàn hảo thì không thể cho thấy gain dưới bất kỳ procedure nào. `--anchor` nêu tên các skill không bao giờ được dùng để chọn nhưng được chạy một lần dưới procedure hiện tại và procedure thắng để cho thấy drift; khi không có flag, danh sách `anchors` của constitution được áp dụng, nên một ground-truth set khai báo một lần sẽ được kiểm tra ở mọi meta run. Với `--apply`, template thắng được ghi vào `.agents/evolution/<target>.md` kèm một bản backup có timestamp, một unified-diff patch, và một record trong `.agents/results/skill-evolution/_procedure/promotions.jsonl` mang parent và candidate hash, constitution hash và evidence (skill, repeat, budget, cặp, khoảng). Không có `--apply` thì không có gì được ghi.

Những gì được giữ cố định: final-test partition của mọi skill không bao giờ được đọc để chọn (metric là training cộng validation gain), evaluator và optimization code được liệt kê là immutable trong constitution, bản thân constitution không thể là target, và một target phải xuất hiện trong `meta_targets`. Các inner run mặc định dùng `--memory none` để một procedure được đánh giá theo các edit nó tạo ra thay vì theo knowledge được recall từ các run trước. Các inner run của một arm chạy chồng nhau giữa các skill (`OMA_META_CONCURRENCY`, mặc định tối đa 4) trong khi các repeat của một skill vẫn chạy tuần tự, vì evidence của mỗi skill được ghi vào artifact file riêng của nó. Mỗi inner run ghi lại procedure hash gộp mà nó chạy dưới đó, nên `oma skill evolution-stats` có thể quy các kết quả về sau cho procedure đã tạo ra chúng.

Đây là hình dạng level-5 được mô tả trong survey về các hệ thống tự cải thiện (Self-Harness held-in/held-out promotion, ADAS repeated evaluation với bootstrap interval, frozen evaluator như trong AlphaEvolve): procedure được hệ thống sửa đổi, nhưng phán quyết bên ngoài nằm ngoài tầm với của loop. Chi phí tăng theo skills × repeats × (1 + candidates) inner run; command in ra upper bound và hỏi xác nhận trừ khi có `--yes`.

### Lineage thăng cấp {#promotion-lineage}

Mỗi lần ghi `--apply` thêm một record vào `.agents/results/skill-evolution/<skill>/promotions.jsonl` và ghi một unified diff có thể review vào `promotions/<candidate-hash>.patch` cạnh đó. Record nêu hash body của parent và candidate, đường dẫn đã cài, đường dẫn backup, và evidence đằng sau lần ghi: validation và final-test lift, promotion decision, fixture suite hash, evaluator protocol revision, và source/target runtime. `oma skill promotions --skill <id>` liệt kê log này.

`oma skill rollback --skill <id>` khôi phục body mà lần apply gần nhất đã thay thế. Nó từ chối khi file đã cài không còn khớp với candidate của lần apply đó (một chỉnh sửa tay về sau sẽ bị bỏ mất), khi backup không khớp với parent đã ghi, hoặc khi lần apply đó đã được rollback; một rollback thành công được thêm vào cùng log với `reverses` trỏ tới lần apply. Với một skill do OMA sở hữu, patch là artifact để mang vào source repository hoặc một user overlay, vì `oma update` ghi đè bản đã cài; record đánh dấu `omaOwned: true` để một lần update về sau không bị nhầm là regression.

`--apply` yêu cầu ít nhất một accepted edit không có validation loss, `finalTest.passed: true` và `promotion.eligible: true`. Các gate này yêu cầu internal task coverage đầy đủ, một mẫu negative-transfer riêng cho candidate không rỗng và được đo đầy đủ, và live isolation được thực thi. Final test bị thiếu, phép đo không đầy đủ hoặc các compiler diagnostic bị suy giảm sẽ ngăn việc ghi. Backup của `SKILL.md` gốc được tạo trước atomic write, và diff được in ra để review.

Live evaluation có thể thỏa isolation gate qua protected profile của Claude hoặc Codex native. Claude giữ nguyên các HOME/target check. Codex xác minh rằng app-server thread tạm không có instruction source hay tool environment trước khi gửi prompt. Các runtime profile khác vẫn là exploratory.

### Xem điều gì đã tiến hóa {#seeing-what-evolved}

Loop tự thông báo ở ba nơi, tất cả đều đọc từ các append-only lineage log chứ không từ bất kỳ tuyên bố nào:

- `oma skill promotions --all` in một câu cho mỗi thay đổi trên mọi skill và procedure: edit nào đã được thực hiện (anchor và replacement của accepted edit), các lift held-in và held-out trước và sau, final test có giữ vững hay không, và với một procedure promotion là chênh lệch gain ghép cặp, khoảng của nó, và các skill mà nó được đo trên đó. `--skill <id>` thu hẹp xuống một skill. Các apply record do phiên bản này ghi mang theo các accepted edit và training lift; record cũ hơn quay về dùng hash.
- `oma doctor` hiển thị một ghi chú **Evolution**: số skill edit đã apply và đã rollback, thay đổi mới nhất cho mỗi skill, các procedure promotion, và những gì đang chờ được đưa ngược lại vào vòng phản hồi (sự cố đã ghi nhận chưa có fixture, các lần chạy thất bại chưa được ghi nhận), kèm lệnh sẽ xử lý chúng.
- Ở đầu một session, các state snapshot hook inject một block `harness evolved since your last session` liệt kê các promotion được ghi từ session gần nhất đã hiển thị một block như vậy; mỗi thay đổi được thông báo một lần. Marker nằm ở `.agents/state/evolution-notice.json`.

Bật [tiến hóa Harness của dự án](./harness-evolution.md) để chạy các chu kỳ phản hồi có ngân sách theo lịch:

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Các chu kỳ tự động áp dụng các thay đổi đạt dưới dạng project overlay, giữ lại công việc chưa hoàn tất để thử lại, và dùng chung một hạn mức dispatch cho toàn bộ chu kỳ. Lịch mặc định là hằng ngày lúc 03:00 giờ địa phương. Dùng `--mode propose` để đánh giá mà không áp dụng, và `oma harness evolution disable` để dừng lịch. Procedure meta-optimization vẫn là một lệnh thủ công riêng.

---

## Live mode {#live-mode}

Live mode gọi Maintainer và Proposer thật, đồng thời chạy lại live eval arm ở mỗi epoch. Nó tốn kém: mỗi task được chấm có baseline và treatment call, judge fixture thêm grading call, và final test chấm body gốc cùng candidate body. Preview báo upper bound theo split thật, gồm validation baseline ban đầu, các call training và compiler, các call validation của candidate, hai final-test score, và các neighbor check ghép cặp cho mọi candidate cộng với candidate cuối cùng. Mỗi call timeout 120 giây. Arm Claude và Codex được bảo vệ (protected) tắt tool, automatic instruction discovery, MCP và optimization memory.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

Cost preview liệt kê upper bound của model call nền trước khi có LLM call nào.

Maintainer, Proposer, các evaluation arm và judge dùng chung một protected text transport trong các thư mục tạm mới. Claude dùng restricted CLI profile của nó. Codex dùng `codex app-server` native với CLI login hiện có, model/provider đã chọn và reasoning effort; nó không thay bằng một API-key client hay fallback sang Claude. Codex profile nhắm tới CLI 0.154.x trên macOS/Linux với native file credential storage và một `auth.json` đã có sẵn. Mỗi call chuẩn bị một `CODEX_HOME` tạm riêng tư tham chiếu tới các config/auth file gốc mà không copy nội dung credential. Việc native token refresh vẫn dùng auth file gốc. Shared bootstrap state bị loại trừ, và state tạm được dọn sau đó. Các credential store keyring, auto và ephemeral hiện chưa được hỗ trợ. Thread contract được kiểm tra trước khi gửi model input; phiên bản không được hỗ trợ, storage mode và lỗi protocol sẽ chấm dứt dispatch. Tool, startup instruction discovery, MCP access và session persistence bị tắt để các compiler process không thể đọc các fixture bị giữ kín qua agent tool. Các compiler vendor khác thất bại một cách tường minh cho đến khi chúng có một verified transport.

Optimizer báo `proposed` cho các edit hợp lệ và `no-action` chỉ khi có phản hồi `NO_ACTION` tường minh. Lỗi process/API trở thành `dispatch-error`; phản hồi sai định dạng không có edit hợp lệ trở thành `parse-error`. Các lỗi này không thể biến thành danh sách edit rỗng. Nếu Maintainer không thể cung cấp pattern đã được validate, nó báo `degraded` kèm lý do dispatch hoặc parsing; các fallback pattern bị loại khỏi persistent knowledge, và run không thể thăng cấp candidate. Lỗi evaluation xuất hiện trong `diagnostics` và các proposal gate record thay vì learned rejection history.

---

## JSON output {#json-output}

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` yêu cầu `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` và `promotion.eligible === true`. `baselineTrainLift` và `finalTrainLift` báo held-in split cạnh các validation lift. Cùng điều kiện đó gate `--apply`: một edit được chấp nhận chỉ vì sửa một training failure sẽ chỉ được ghi khi final test cũng pass. Final test hoặc promotion object bị thiếu không thể tạo ra `ok: true`. `_split` count cho biết partition fixture local thực tế của run.

Ví dụ, một candidate chưa được đo có thể tạo ra đoạn trích report này:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Hãy kiểm tra `diagnostics`, `promotion.reasons` và mọi `finalTest.blocker` trước khi thử lại. `rejectedCount` không tăng đối với một proposal inconclusive. Một final-test failure đã đo có thể làm tăng số rejection audit của run trong khi vẫn bị loại khỏi persistent rejection knowledge.

---

## Lưu ý SSOT cho skill `oma-*` {#ssot-caveat-for-oma-skills}

Skill có ID bắt đầu bằng `oma-` do oh-my-agent sở hữu và bị `oma update` ghi đè. Với các skill này, không khuyến khích `--apply` — dùng `--dry-run` (mặc định), review diff đề xuất và upstream thay đổi vào registry nếu cải tiến có ý nghĩa. Với skill do người dùng viết, `--apply` an toàn.

Command in cảnh báo khi target skill do OMA sở hữu:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Overfitting guard {#overfitting-guard}

Maintainer và Proposer nhận TRAIN rollout evidence. Candidate selection dùng held-out VALIDATION split, còn runner sở hữu TEST split riêng. Việc chạy compiler không dùng tool ngăn quyền truy cập workspace tới các fixture và evaluator bị giữ kín đó.

Final test thất bại ngăn việc áp dụng. Kết quả của nó vẫn có sẵn để audit, nhưng cả final-test gate outcome lẫn các proposal inconclusive đều không đưa vào persistent optimization knowledge. Các luồng recorder, history reload và semantic recall cũng loại các legacy final-test outcome, nên một run sau không thể dùng thành công hay thất bại final test trước đó làm training feedback.

---

## Tích hợp CI {#ci-integration}

Dùng evaluation replay cho một kiểm tra CI offline đối với các candidate-specific recording hiện có:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

Bản thân CLI optimization yêu cầu `--live`; nó chưa có recorded-proposal replay adapter. Hướng dẫn trước đây mô tả `oma skill optimize --mock` là một optimizer offline hoàn chỉnh là không chính xác. Hãy chuyển các job replay offline sang `oma skill eval --mock`, hoặc bật live optimization một cách tường minh cùng chi phí model của nó. Với các lần chạy optimization, hãy kiểm tra JSON `ok` và `promotion.eligible`: exit zero cũng bao gồm các run hoàn tất mà không tìm thấy candidate nào có thể thăng cấp.

Exit code của optimization:
- `0` — optimization hoàn tất (có hoặc không có cải thiện)
- `1` — input không hợp lệ hoặc lỗi thực thi, gồm CLI optimization không live, các flag `--live --mock` xung đột, số fixture không đủ, compiler vendor không được hỗ trợ, optimizer dispatch thất bại hoặc output của optimizer sai định dạng

---

## Xem thêm {#see-also}

- [Skill Utility Eval](/docs/guide/skill-eval) — soạn task fixture, checker type, mock/live mode và directory `_rollouts/`.
- [CLI Commands](/docs/cli-interfaces/commands) — tham chiếu flag cho mọi skill management command.
