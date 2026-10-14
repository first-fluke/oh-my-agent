---
title: Vì sao chọn oh-my-agent
description: Chọn oh-my-agent khi bạn cần skill và workflow do repository sở hữu, dispatch đa vendor và xác minh rõ ràng.
---

# Vì sao chọn oh-my-agent

oh-my-agent bổ sung một lớp do repository sở hữu quanh các CLI agent mà team bạn đang dùng. Thư mục `.agents/` lưu [skill](./glossary.md#skill), [workflow](./glossary.md#workflow), [định nghĩa agent](./glossary.md#agent-definition), rule và cấu hình model. Các tệp native của vendor được tạo từ [nguồn sự thật](./glossary.md#ssot) đó, vì vậy có thể review và thay đổi cùng project.

## Chọn khi repository cần lớp điều phối {#choose-it-when-the-repository-needs-the-coordination-layer}

OMA phù hợp khi bạn cần một hoặc nhiều điều sau:

- **Nhiều host hoặc vendor agent.** `model_preset: auto` dùng cấu hình native của runtime hiện tại. Preset cố định và preset tùy chỉnh có thể định tuyến role tới vendor khác; `oma agent spawn` xử lý dispatch không native.
- **Workflow team có thể lặp lại.** `/work` xử lý một task có phạm vi, `/orchestrate` điều phối công việc được ủy quyền, `/ultrawork` chạy công việc song song kèm bước review, còn `/ralph` lặp lại task với phase judge rõ ràng.
- **Instruction do repository sở hữu.** Skill, workflow, rule và định nghĩa agent nằm cạnh mã nguồn. `oma link` chiếu các tệp đã chọn sang định dạng của vendor được hỗ trợ.
- **Kiểm tra cơ học và kết quả bền vững.** Lần chạy agent có thể ghi receipt status và result có cấu trúc, còn `oma verify agent <agent-type>` và `oma docs verify` cung cấp các kiểm tra rõ ràng.

Nếu project chỉ dùng một host và không cần skill, workflow hoặc định tuyến vendor dùng chung, các tệp `.agents/` và lệnh CLI bổ sung có thể không đáng với công sức thiết lập. OMA là lớp điều phối; nó không thay thế model, editor hoặc tiêu chí chấp nhận riêng của project.

## Xác minh là lệnh bạn tự chọn {#verification-is-a-command-you-select}

Chạy `oma verify agent <agent-type> --workspace <path>` khi muốn kiểm tra role backend, frontend, mobile, QA, debug hoặc planning. Verifier kết hợp các kiểm tra tĩnh với lệnh đã cấu hình như test, type check, SQL check hoặc `flutter analyze`; xem [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). Báo cáo hiển thị kết quả của từng kiểm tra. Việc các kiểm tra này pass không chứng minh feature đáp ứng yêu cầu sản phẩm hoặc domain, nên vẫn cần review tiêu chí chấp nhận của task.

`/ralph` thêm một phase [judge](./glossary.md#judge) riêng khi bạn chọn workflow đó. Nó kiểm tra lại tiêu chí đã khai báo qua nhiều iteration và ghi artifact của workflow; đây không phải cổng chạy cho mọi prompt thông thường. Việc tải skill cũng không khởi động mọi workflow hay lệnh xác minh.

## Dispatch vẫn hiển thị rõ {#dispatch-remains-visible}

`oma doctor --profile` hiển thị vendor và model đã resolve cho từng vai trò dispatch. `oma agent spawn <agent-id> <prompt> <session-id>` là đường CLI rõ ràng khi role không do host hiện tại xử lý. Quy tắc resolve model và hành vi theo provider được ghi trong [Important Defaults](./important-defaults.md) và [Cấu hình model theo từng agent](../guide/per-agent-models.md).

Hook chỉ có thể kích hoạt workflow khi tích hợp host liên quan được bật. Host thực hiện định tuyến skill native, còn định tuyến workflow tuân theo workflow hoặc hook đã chọn; prompt thông thường không đảm bảo một skill hay gate cụ thể sẽ chạy.

Các điều khiển điều phối tùy chọn được ghi trong [session quota cap](../guide/configuration-reference.md#session-quota-caps), [vòng retry và exploration của `/orchestrate`](../core-concepts/workflows.md#orchestrate) và [workspace assignment](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## Đánh đổi trong thực tế {#the-practical-trade-off}

OMA cho team một nơi dùng chung để định nghĩa định tuyến, bước thực thi, kiểm tra và tệp output. Đổi lại, team phải giữ cấu hình repository hiện hành và quyết định workflow hoặc lệnh xác minh nào thuộc contract chấp nhận. Đánh đổi này hữu ích khi tính nhất quán giữa các contributor quan trọng hơn việc cài đặt nhỏ nhất có thể.

Xem thảo luận định vị ban đầu tại [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Bước tiếp theo {#next-steps}

- [Quick Start](./quick-start.md): cài đặt, kiểm tra thiết lập và chạy một task có phạm vi
- [Important Defaults](./important-defaults.md): những gì installer bật sẵn và cách thay đổi
- [Cài đặt](./installation.md#presets): chọn skill preset bao quát các workflow bạn định dùng
- [Các workflow](../core-concepts/workflows.md): khi nào dùng `/work`, `/orchestrate`, `/ultrawork` và `/ralph`
- [Troubleshooting](../guide/troubleshooting.md): cách khắc phục sự cố cài đặt, vendor và hook
