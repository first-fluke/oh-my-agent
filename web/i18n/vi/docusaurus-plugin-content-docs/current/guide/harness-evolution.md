---
title: "Tiến hóa Harness của dự án"
sidebar_label: Tiến hóa Harness của dự án
description: Bật các cải tiến skill theo lịch, có ngân sách, từ bằng chứng của các lần chạy OMA, với overlay dự án bền vững và khả năng rollback.
---

# Tiến hóa Harness của dự án {#project-harness-evolution}

OMA có thể thu thập bằng chứng từ các lần chạy agent được theo dõi và xử lý các lần thất bại trong một chu kỳ phản hồi theo lịch. Các thay đổi skill tự động **bị tắt cho đến khi bạn bật chúng cho một dự án**. Mỗi chu kỳ có một ngân sách gọi model hữu hạn, và một thay đổi được áp dụng phải vượt qua các gate đánh giá skill hiện có.

Luồng tự động cải thiện các tài liệu skill. Những thay đổi đối với quy trình optimizer hoặc maintainer vẫn là [meta-optimization](/docs/guide/skill-opt) riêng, được gọi thủ công.

## Bật cho một dự án {#enable-a-project}

Chạy từ thư mục gốc của dự án:

```bash
# Example allowance: at most 300 model dispatches per scheduled cycle
oma harness evolution enable --max-dispatches 300

# Evaluate proposals without applying them
oma harness evolution enable --max-dispatches 300 --mode propose

# Choose a schedule in the operating system's local time
oma harness evolution enable --max-dispatches 300 --cron "0 3 * * *"

oma harness evolution status --json
```

Lịch mặc định là hằng ngày lúc 03:00 giờ địa phương, và mode mặc định là `apply`. `--max-dispatches` là bắt buộc khi bật và phải là số nguyên dương. Giá trị trong ví dụ là một hạn mức số lần gọi, không phải ước tính chi phí hay cam kết rằng một chu kỳ sẽ hoàn tất. Các fixture suite lớn hơn và việc chấm điểm lặp lại tiêu tốn nhiều lần gọi hơn.

<!-- oma-docs:ignore-start -->
Cài đặt được lưu trong `.agents/evolution/harness-evolution.json`. Bằng chứng được tạo ra, trạng thái thử lại và khóa chu kỳ nằm dưới `.agents/state/harness-evolution/`.
<!-- oma-docs:ignore-end -->

Việc bật sẽ đăng ký một job tích hợp sẵn với OS scheduler hiện có của OMA. Job này gọi trực tiếp chu kỳ phản hồi. Bật lại sẽ cập nhật job của dự án thay vì tạo thêm một job khác.

```bash
# Run one cycle now under the saved mode and budget
oma harness evolution run --json

# Stop future cycles; retain evidence and applied improvements
oma harness evolution disable
```

Một dự án đã bị tắt sẽ không chạy bất kỳ công việc nào dùng model qua lệnh evolution, kể cả một lần gọi theo lịch đến muộn. Việc tắt không rollback các thay đổi đã được áp dụng.

## Điều gì xảy ra tự động {#what-happens-automatically}

1. **Ghi bằng chứng hoàn tất.** Các lần chạy được OMA theo dõi để lại tham chiếu cục bộ tới kết quả và bằng chứng xác minh của chúng. Bước hoàn tất này không phát sinh thêm model call. Việc hoàn tất lặp lại cùng một lần chạy không tạo ra bằng chứng trùng lặp.
2. **Thu thập các lần thất bại theo lịch.** Chu kỳ quét các lần chạy thất bại đủ điều kiện, suy ra kỳ vọng từ hợp đồng task đã ghi của chúng, và kiểm tra rằng một fixture hồi quy được đề xuất thực sự từ chối output thất bại đã được giữ lại.
3. **Tối ưu các skill bị ảnh hưởng.** Các sự cố được gộp nhóm theo skill. Mỗi skill được tối ưu dưới các check training, validation, final-test, cô lập và chuyển giao tiêu cực hiện có.
4. **Áp dụng hoặc báo cáo.** Ở mode `apply`, một candidate đạt trở thành overlay skill của dự án. Ở mode `propose`, chu kỳ ghi lại kết quả mà không cài đặt nó.
5. **Báo cáo thay đổi.** Dùng status và lịch sử thăng cấp hiện có để kiểm tra kết quả. Các thay đổi đã áp dụng cũng được đưa vào thông báo evolution của phiên kế tiếp.

OMA không tự động quan sát mọi cuộc hội thoại native hay mọi lần người dùng sửa lại. Đầu vào là bằng chứng từ các lần chạy mà OMA thực sự theo dõi. Một lần chạy không có output được giữ lại hoặc hợp đồng nghiệm thu có thể cần một [đặc tả sự cố](/docs/guide/harness-incidents) được viết thủ công.

## Ngân sách và thử lại {#budget-and-retries}

Chu kỳ dùng chung một hạn mức số lần gọi cho việc ghi nhận, soạn bảng tiêu chí chấm, routing, chấm điểm, tối ưu skill, các neighbor task và đánh giá cuối cùng. Một model call trừ vào hạn mức trước khi dispatch. Các lần gọi được lớp thực thi thử lại cũng được tính. Giới hạn constitution chặt hơn của một skill vẫn được áp dụng.

Khi hạn mức cạn, việc đánh giá vẫn chưa hoàn tất và candidate bị ảnh hưởng không thể được áp dụng. Báo cáo ghi lại mức sử dụng và công việc còn tồn đọng. Tại mỗi thời điểm chỉ có một chu kỳ của dự án đang chạy.

Việc tạo một fixture không đánh dấu quá trình tối ưu của sự cố là đã hoàn tất. Quá trình tối ưu bị gián đoạn hoặc thất bại vẫn ở trạng thái chờ và có thể tiếp tục sau backoff mà không nhân đôi fixture. Một kết quả được đánh giá đầy đủ nhưng không có thay đổi chấp nhận được sẽ được ghi là đã xử lý, nên cùng một bằng chứng không kích hoạt việc tối ưu lặp lại vô hạn. Bằng chứng mới có thể kích hoạt một lần thử khác.

Chuyển từ mode đề xuất sang mode áp dụng khiến các đề xuất chưa áp dụng đủ điều kiện để xử lý. Việc áp dụng vẫn cần đánh giá hiện tại và nội dung nguồn không đổi; một đề xuất cũ không phải là chỉ thị ghi vô điều kiện.

## Overlay skill bền vững {#persistent-skill-overlays}

Các thay đổi tự động được lưu tách biệt khỏi các skill definition được quản lý, trong vùng evolution do người dùng sở hữu của dự án. Việc đánh giá và các vendor skill link cục bộ của dự án dùng body hiệu lực được chọn từ base được quản lý và overlay đủ điều kiện của nó. Các bản cài vendor ở phạm vi HOME không bị chuyển hướng sang overlay của dự án. Một bản copy không được quản lý trong vendor directory của dự án phải được giải quyết trước khi áp dụng tự động. Tài nguyên của skill vẫn khả dụng tại các đường dẫn tương đối của chúng.

Một overlay ghi lại base mà nó đã được đánh giá dựa trên đó. Sau `oma update`:

- Base không đổi tiếp tục dùng overlay của nó.
- Base đã thay đổi vẫn giữ nguyên overlay nhưng đánh dấu nó là xung đột và dùng base đã cập nhật. Bản đánh giá cũ không thể xác lập rằng overlay an toàn trên base mới.

Một chỉnh sửa được thực hiện trong khi quá trình tối ưu đang chạy sẽ ngăn candidate ghi đè lên nội dung đã thay đổi đó. Status báo các xung đột để review.

## Kiểm tra và hoàn tác {#inspect-and-undo}

```bash
oma harness evolution status --json
oma skill promotions --all
oma skill rollback --skill oma-docs
```

Các bản ghi thăng cấp giữ lại hash của candidate và parent, bằng chứng đánh giá và một patch có thể review. Rollback overlay đầu tiên khôi phục việc dùng base được quản lý; rollback một overlay về sau khôi phục overlay trước đó. Các chỉnh sửa không xác định được giữ nguyên: rollback từ chối loại bỏ nội dung không còn khớp với candidate đã ghi.

Lệnh thủ công `oma skill optimize --apply` hiện có vẫn khả dụng. Evolution theo lịch chọn tường minh luồng áp dụng qua overlay.

## Phạm vi của bằng chứng {#scope-of-the-evidence}

Một software test đạt chỉ xác nhận phần wiring và các quy tắc đánh giá. Nó không chứng minh rằng các thay đổi tự động lặp lại cải thiện công việc thực của dự án theo thời gian. Hãy kiểm tra các lần thăng cấp, chi phí, regression và lịch sử rollback thực tế trước khi tăng hạn mức hoặc mở rộng tự động hóa. Vòng phản hồi theo lịch này không gọi việc thăng cấp quy trình L5.
