---
title: "Ca hồi quy của sự cố"
sidebar_label: Ca hồi quy của sự cố
description: Ghi nhận một lỗi agent đã quan sát, giữ lại bằng chứng của nó và đánh giá một harness candidate theo một hợp đồng hồi quy rõ ràng.
---

# Ca hồi quy của sự cố

`oma harness incident` nối một lỗi đã quan sát với một ca hồi quy và lần đánh giá candidate tiếp theo. Công cụ ghi nhận các quan sát tách riêng khỏi các giả thuyết nhân quả. Bản thân một quy trình thất bại không chứng minh rằng model gây ra sự cố.

## Tìm candidate

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

Đợt quét đọc `.agents/state/agent-runs/`, giữ lại những lần chạy có trạng thái là `failed`, `blocked` hoặc `partial`, và loại bỏ mọi lần chạy mà một sự cố đã ghi nhận đang tham chiếu qua `source.runId`. `--skeleton` in ra đặc tả của một lần chạy với id, agent, lần chạy nguồn, lỗi quan sát được, mã thoát và, khi runner giữ lại được, phần cuối trong output của agent; `expected_checks` để nguyên là `TODO` vì hành vi đúng là một quyết định mà đợt quét không thể đưa ra. `oma agent spawn` và `oma agent parallel` giữ 64 KiB cuối trong nhật ký của mỗi lần chạy dưới `.agents/state/agent-runs/<run-id>.output.txt` và tham chiếu nó từ bản ghi lần chạy, nên `capture --run` nhập output đó làm quan sát khi đặc tả không có sẵn output, và `incident promote` có thể kiểm chứng fixture dẫn xuất từ đó dựa trên output này. Hãy điền vào đặc tả, rồi ghi nhận với `--run <run-id>` để danh tính của lần chạy và vân tay workspace được giữ nguyên.

## Tự động ghi nhận một lần chạy thất bại

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

Một lần chạy thất bại, bị chặn hoặc chạy một phần mà task của nó có hợp đồng thì không cần đặc tả viết tay. Hành vi mong đợi chính là các tiêu chí nghiệm thu của hợp đồng, được quyết định trước lần chạy; các tiêu chí nằm trong một xác nhận kiểm tra không đạt chính là tập chưa được đáp ứng, hoặc là mọi tiêu chí khi lần chạy chưa hề được kiểm tra. opt-agent viết lại các tiêu chí chưa đáp ứng thành bảng tiêu chí chấm của giám khảo (`PASS only if …`), giám khảo chấm chính output đã được lưu của lần chạy theo bảng tiêu chí đó, và sự cố chỉ được ghi nhận khi output đó không đạt: một bảng tiêu chí mà chính lỗi đó vượt qua thì đã không nắm bắt được lỗi. Đặc tả được ghi dưới `.agents/results/incidents/_specs/<id>.json` và được ghi nhận kèm danh tính của lần chạy, mang bảng tiêu chí như một check nghiệm thu `output_judge`. Những lần chạy không có output được lưu, không có prompt hoặc không có hợp đồng được liệt kê là không thể ghi nhận, kèm theo lý do.

`output_judge` là một hợp đồng được chấm điểm. Bộ đánh giá harness cơ học báo cáo nó là chưa được đánh giá; mục đích của nó là fixture hồi quy skill mà `incident promote` dẫn xuất từ nó với cùng bảng tiêu chí chấm.

## Ghi nhận sự cố

Lưu một đặc tả JSON bên trong dự án:

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

Đường dẫn của `initial_workspace`, `evidence_files` và fixture của dependency là tương đối so với tệp đặc tả. Đường dẫn `checker` của một check kiểu lệnh là tương đối so với dự án. Cú pháp của check đúng như [Đánh giá Harness](./harness-eval.md). Thư mục ban đầu phải là một fixture của task trước khi chạy được cung cấp sẵn, không chứa các tệp chỉ dẫn của OMA hay của vendor; harness được đánh giá được nạp vào riêng.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` tham chiếu một `.agents/state/agent-runs/<run-id>.json` đã tồn tại. Nó giữ nguyên danh tính lần chạy và phiên, vendor, trạng thái và vân tay workspace gốc. Một prompt được cung cấp sẽ ưu tiên hơn prompt đã ghi của lần chạy. `source.trace_id` có thể nối một sự cố đã báo cáo với một trace bên ngoài mà không cần lấy về hay tải lên.

Bản manifest đã ghi nhận nằm tại `.agents/results/incidents/<id>/incident.json`. Nó gồm ảnh chụp ban đầu khi được cung cấp, các hash của bằng chứng nguồn và tệp checker, các check nghiệm thu, các giới hạn, và một hash của manifest. Không thể ghi đè lên ID đã tồn tại. Văn bản quan sát nhạy cảm được che nội dung; việc che nội dung được báo cáo như một giới hạn đối với khả năng phát lại chính xác. Việc thu thập ảnh chụp từ chối các tệp không được hỗ trợ và có giới hạn về kích thước từng tệp, số lượng và tổng kích thước. Các tham chiếu bằng chứng giữ lại hash và đường dẫn, không phải bản sao của mọi tệp nguồn được tham chiếu.

Đối tượng `cause` không bắt buộc gồm `category`, `hypothesis`, `confidence` và `evidence`. Các nhóm là `model`, `tool`, `config`, `context`, `application`, `evaluator` và `unknown`. Nếu bỏ qua thì nguyên nhân vẫn là `unknown`.

## Thăng cấp lên fixture của skill

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

Một sự cố đã ghi nhận trở thành fixture hồi quy cho skill mà agent gây lỗi đã thực thi, để `oma skill optimize` có thể sửa skill dựa trên fixture đó. Skill được chọn bằng cách route prompt của sự cố qua danh mục skill đã cài, dùng đúng phép thăm dò ở mức mô tả mà `oma skill eval --routing` dùng (một lần gọi model); khi route không chọn được gì, hệ thống dùng phần tử `skills:` đầu tiên trong định nghĩa agent dưới `.agents/agents/<agent>.md`, nếu không thì dùng skill đã cài đặt có tên `oma-<agent>`. `--skill` ghi đè quyết định đó, và việc thăng cấp ghi lại ai trong ba nguồn đã quyết định (`attribution`). Fixture được ghi vào `.agents/eval/<skill>/incident-<id>.yaml` với `group: incident-<id>` để nó không bao giờ nằm vắt qua phần chia train, validation và test, còn việc thăng cấp được ghi cạnh sự cố dưới dạng `promotion.json`. Một sự cố chỉ được thăng cấp một lần.

Checker đến từ các check nghiệm thu. Khi mọi check đều là `output_contains`, fixture là một `assert` xác định. Nếu không, các check không thể chạy trong một lần đánh giá skill (không có tệp hay lệnh nào), nên `--draft` yêu cầu opt-agent đưa ra một bảng tiêu chí chấm bắt đầu bằng `PASS only if` và nêu tên lỗi đã quan sát. Bất kể theo cách nào, fixture chỉ được nhận khi output thất bại đã ghi không vượt qua nó: một assert mà output quan sát được đã thỏa mãn, hay một bảng tiêu chí phác thảo mà giám khảo cho đạt trên output đó, đều bị từ chối vì không phải là một ca hồi quy. Sự cố không có output quan sát được thì không thể kiểm chứng và cần `--force`, và điều này được ghi như một giới hạn.

## Khép kín vòng lặp

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback` là vòng lặp phản hồi triển khai gói trong một lệnh duy nhất: với `--scan-runs`, mọi lần chạy thất bại chưa được ghi nhận mà có hợp đồng sẽ được ghi nhận trước (xem ở trên), sau đó mọi sự cố đã ghi nhận mà chưa có fixture sẽ được thăng cấp (phác thảo bảng tiêu chí chấm khi cần), các skill bị ảnh hưởng được gộp nhóm, và với `--live`, mỗi skill được tối ưu một lần trên suite đã mở rộng của nó dưới các gate bình thường (nghiệm thu held-in và held-out, chuyển giao tiêu cực đã xác nhận, final test thuộc về runner). Báo cáo dưới `.agents/results/feedback/feedback-<ts>.json` liệt kê các lần thăng cấp, những sự cố bị bỏ qua kèm lý do, và kết quả của từng skill kèm diff, nhờ vậy chuỗi từ một lỗi quan sát được đến một chỉnh sửa candidate là một bản ghi có thể kiểm toán được. Hãy chạy lệnh này sau khi các lần chạy agent thất bại đã được ghi nhận, từ một scheduler hoặc một post-run hook; `oma schedule create <agent> "Run \`oma harness feedback --scan-runs --apply --json\` and summarize the report" --cron "0 3 * * *"` là dạng chạy hằng đêm, và ảnh chụp trạng thái của phiên tiếp theo sẽ thông báo bất cứ điều gì nó đã áp dụng.

Điều vẫn là quyết định của con người: một lần chạy không có hợp đồng task thì không có hành vi mong đợi nào được ghi, nên nó được `incident scan` liệt kê và chỉ được ghi nhận qua một đặc tả; `--skeleton` phác thảo đặc tả đó.

## Xuất và đánh giá

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

Lệnh xuất tạo ra ảnh chụp ban đầu đã lưu cùng một suite thăm dò gồm một ca. Hash của manifest và danh tính lần chạy và trace nguồn đi cùng task vào trong lần đánh giá và việc ghi. Thay đổi đối với các tệp đã xuất, prompt, agent, các check, hoặc mã nguồn checker đã pin đều làm việc tái sử dụng mất hiệu lực. Hãy tạo một ID sự cố mới để thay đổi hợp đồng nghiệm thu.

Theo mặc định, `reproduce` bắt đầu một phép so sánh baseline và candidate live mới và ghi lại. Việc xác nhận chi phí live thông thường vẫn áp dụng trừ khi có `--yes`. Lệnh này dùng vendor agent đã cấu hình cho task của harness, kể cả Codex; nó không áp đặt hồ sơ compiler được bảo vệ của bộ tối ưu skill vào việc thực thi task.

Nếu không có trạng thái ban đầu nào được ghi nhận, `capture` và `show` vẫn hoạt động, nhưng phép xuất có thể chạy được và việc tái hiện khi chạy sẽ dừng với lỗi thiếu bằng chứng. Cây làm việc hiện tại của một lần chạy trong quá khứ không thể xác lập trạng thái gốc của nó. Ngay cả một ảnh chụp ban đầu được cung cấp riêng cũng không chứng minh được sự tương đương với lần chạy quá khứ đó; báo cáo nêu rõ giới hạn này.

## Chọn thao tác với bằng chứng

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| Thao tác | Điều gì xảy ra |
|---|---|
| `inspect` | Đọc và tổng hợp các phán quyết đã lưu. Không chạy check hay agent nào. |
| `rescore` | Áp các check output và tệp hiện hành lên bằng chứng thô đã lưu. Các trường pass/fail cũ bị bỏ qua. |
| `fixture-replay` | Phát lại dữ liệu phản hồi công cụ và các thay đổi tệp được cung cấp trên trạng thái ban đầu đã ghi. Không chạy model hay tiến trình công cụ nào. |
| `rerun` | Bắt đầu các lần gọi agent baseline và candidate thật từ trạng thái ban đầu đã ghi. Việc này phát sinh mức sử dụng model thông thường. |

Với một hợp đồng nghiệm thu đã sửa đổi, hãy tạo một suite harness riêng và dùng `oma harness eval --action rescore` với cùng danh tính suite, task và sự cố cùng với prompt đó. Bản thân suite sự cố đã xuất là bất biến. Xem [chi tiết về ghi và phát lại](./harness-eval.md) để biết các yêu cầu về bằng chứng thô và schema của transcript công cụ.

Khai báo các dependency bên ngoài dưới dạng `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }`. Một dependency dạng fixture trỏ tới một tệp dùng đầy đủ schema transcript của harness, với ID sự cố là `taskId`. Việc phát lại sự cố ngoại tuyến từ chối các dependency live hoặc unavailable, tệp fixture bị thiếu, hash của fixture bị thay đổi, phản hồi được đặt tên bị thiếu, và các thay đổi request, response hoặc tệp khác với transcript đã pin. Nó vẫn không thể cam đoan rằng tác giả đã khai báo mọi dependency bên ngoài. Một lần chạy lại live cũng không thể bảo đảm rằng một dịch vụ bên ngoài xử sự như trước đây.

Việc ghi nhận, xuất và đánh giá phát ra các sự kiện `harness.incident.*` cục bộ, nối sự cố với hash của candidate và baseline, chế độ thực thi, cùng ID của các task đã được sửa đúng hoặc bị hồi quy. Một sự cố chỉ có một ca là bằng chứng hồi quy, không phải là thứ thay thế cho các suite validation và final test. Các hồ sơ harness hiện tại báo `promotionReady: false`; những thao tác này không xác lập sự cô lập của final test được bảo vệ và cũng không tự động thăng cấp candidate.
