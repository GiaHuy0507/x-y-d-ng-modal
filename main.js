const $ = document.querySelector.bind(document); // tìm 1 phần tử
const $$ = document.querySelectorAll.bind(document); // tìm nhiều phần tử

// Hàm tạo (constructor function)
// options = {
//   templateId: "modal-1",
//   destroyOnClose: false,
//   footer: true,
//   cssClass: [],
//   closeMethods: ["button", "overlay", "escape"],
//   onOpen,
//   onClose
// }

function Modal(options = {}) {
  // destructuring
  const {
    templateId,
    destroyOnClose = true,
    footer = false,
    cssClass = [],
    closeMethods = ["button", "overlay", "escape"],
    onOpen,
    onClose,
  } = options;

  // Tìm template
  const template = $(`#${templateId}`);

  // Nếu không tìm thấy template
  if (!template) {
    console.error(`#${templateId} does not exist!`);
    return;
  }

  // Modal cho phép đóng bằng cách nào
  this._allowButtonClose = closeMethods.includes("button");
  this._allowBackdropClose = closeMethods.includes("overlay");
  this._allowEscapeClose = closeMethods.includes("escape");

  // getScrollbarWidth:
  // Đo độ rộng của thanh scrollbar
  // để thêm padding-right cho body, tránh giao diện bị giật
  function getScrollbarWidth() {
    // Nếu đã đo rồi thì lấy lại kết quả cũ
    if (getScrollbarWidth.value) return getScrollbarWidth.value;

    const div = document.createElement("div");

    Object.assign(div.style, {
      overflow: "scroll",
      position: "absolute",
      top: "-9999px",
    });

    document.body.appendChild(div);

    // offsetWidth: kích thước bao gồm scrollbar
    // clientWidth: kích thước không bao gồm scrollbar
    const scrollbarWidth = div.offsetWidth - div.clientWidth;

    document.body.removeChild(div);

    // Lưu lại kết quả để lần sau không phải đo lại
    getScrollbarWidth.value = scrollbarWidth;

    return scrollbarWidth;
  }

  // _build:
  // Xây dựng toàn bộ modal
  this._build = () => {
    // Lấy nội dung từ template
    // cloneNode(true) = clone toàn bộ nội dung bên trong template
    const content = template.content.cloneNode(true);

    // Create modal elements

    // Tạo backdrop
    this._backdrop = document.createElement("div");
    this._backdrop.className = "modal-backdrop";

    // Tạo container
    const container = document.createElement("div");
    container.className = "modal-container";

    // Thêm các class tùy chỉnh
    cssClass.forEach((className) => {
      if (typeof className === "string") {
        container.classList.add(className);
      }
    });

    // Nếu cho phép đóng bằng button
    if (this._allowButtonClose) {
      // Tạo nút đóng
      const closeBtn = document.createElement("button");

      closeBtn.className = "modal-close";
      closeBtn.innerHTML = "&times;";

      container.append(closeBtn);

      // Khi click button -> đóng modal
      closeBtn.onclick = () => this.close();
    }

    // Tạo modal content
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    // Đưa nội dung template vào modal-content
    modalContent.append(content);

    // Đưa modal-content vào container
    container.append(modalContent);

    // Nếu có footer
    if (footer) {
      this._modalFooter = document.createElement("div");
      this._modalFooter.className = "modal-footer";

      // Nếu đã có nội dung footer từ trước
      if (this._footerContent) {
        this._modalFooter.innerHTML = this._footerContent;
      }

      this._footerButtons.forEach((button) => {
        this._modalFooter.append(button);
      });

      container.append(this._modalFooter);
    }

    // Đưa container vào backdrop
    this._backdrop.append(container);

    // Đưa backdrop vào body
    document.body.append(this._backdrop);
  };

  // setFooterContent:
  // Dùng để thiết lập nội dung cho footer
  this.setFooterContent = (html) => {
    this._footerContent = html;

    // Nếu footer đã được tạo
    // thì cập nhật nội dung ngay
    if (this._modalFooter) {
      this._modalFooter.innerHTML = html;
    }
  };

  this._footerButtons = [];
  this.addFooterButton = (title, cssClass, callback) => {
    const button = document.createElement("button");
    button.className = cssClass;
    button.innerHTML = title;
    button.onclick = callback;

    this._footerButtons.push(button);
  };
  // open:
  // Mở modal
  this.open = () => {
    // Nếu modal chưa được xây dựng
    // thì xây dựng nó trước
    if (!this._backdrop) {
      this._build();
    }

    // Đợi DOM cập nhật xong rồi mới thêm show
    // để CSS transition có thể hoạt động
    setTimeout(() => {
      this._backdrop.classList.add("show");
    }, 0);

    // Disable scrolling
    document.body.classList.add("no-scroll");

    // Thêm padding-right bằng độ rộng scrollbar
    // để tránh nội dung body bị giật sang phải
    document.body.style.paddingRight = getScrollbarWidth() + "px";

    // Attach event listeners

    // Nếu cho phép click overlay để đóng
    if (this._allowBackdropClose) {
      this._backdrop.onclick = (e) => {
        // Chỉ đóng khi click đúng backdrop
        // không phải click vào container/content
        if (e.target === this._backdrop) {
          this.close();
        }
      };
    }

    // Nếu cho phép dùng phím Escape để đóng
    if (this._allowEscapeClose) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.close();
        }
      });
    }

    // Đợi transition mở modal kết thúc
    // rồi gọi onOpen
    this._onTransitionEnd(() => {
      if (typeof onOpen === "function") {
        onOpen();
      }
    });

    // Trả về backdrop
    // để bên ngoài có thể query các phần tử bên trong modal
    return this._backdrop;
  };

  // _onTransitionEnd:
  // Chạy callback sau khi transition của modal kết thúc
  this._onTransitionEnd = (callback) => {
    this._backdrop.ontransitionend = (e) => {
      // Chỉ xử lý transition của transform
      if (e.propertyName !== "transform") return;

      // Nếu callback là function thì gọi callback
      if (typeof callback === "function") {
        callback();
      }
    };
  };

  // close:
  // Đóng modal
  this.close = (destroy = destroyOnClose) => {
    // Xóa class show
    // CSS sẽ chạy transition đóng modal
    this._backdrop.classList.remove("show");

    // Chờ transition đóng hoàn thành
    this._onTransitionEnd(() => {
      // Nếu destroy = true
      // thì xóa modal khỏi DOM
      if (this._backdrop && destroy) {
        this._backdrop.remove();

        // Đặt lại null để lần open sau
        // có thể _build() lại modal
        this._backdrop = null;

        // Footer cũng không còn tồn tại
        this._modalFooter = null;
      }

      // Enable scrolling
      document.body.classList.remove("no-scroll");

      // Xóa padding-right đã thêm
      document.body.style.paddingRight = "";

      // Gọi callback onClose
      if (typeof onClose === "function") {
        onClose();
      }
    });
  };

  // destroy:
  // Ép modal đóng và xóa khỏi DOM
  this.destroy = () => {
    this.close(true);
  };
}

// ======================================================
// MODAL 1
// ======================================================

const modal1 = new Modal({
  templateId: "modal-1",

  // Đóng modal nhưng không xóa khỏi DOM
  destroyOnClose: false,

  onOpen: () => {
    console.log("Modal 1 opened");
  },

  onClose: () => {
    console.log("Modal 1 closed");
  },
});

$("#open-modal-1").onclick = () => {
  modal1.open();
};

// ======================================================
// MODAL 2
// ======================================================

const modal2 = new Modal({
  templateId: "modal-2",

  // Có thể chỉ định cách đóng:
  // closeMethods: ["button", "overlay", "escape"],

  // Thêm class CSS tùy chỉnh cho container
  cssClass: ["class1", "class2", "classN"],

  onOpen: () => {
    console.log("Modal 2 opened");
  },

  onClose: () => {
    console.log("Modal 2 closed");
  },
});

$("#open-modal-2").onclick = () => {
  // open() trả về backdrop
  const modalElement = modal2.open();

  // Tìm form bên trong modal
  const form = modalElement.querySelector("#login-form");

  if (form) {
    form.onsubmit = (e) => {
      // Không cho form reload trang
      e.preventDefault();

      // Lấy dữ liệu form
      const formData = {
        email: $("#email").value.trim(),
        password: $("#password").value.trim(),
      };

      console.log(formData);
    };
  }
};

// ======================================================
// MODAL 3
// ======================================================

const modal3 = new Modal({
  templateId: "modal-3",

  // Cho phép tạo footer
  footer: true,

  onOpen: () => {
    console.log("Modal 3 opened");
  },

  onClose: () => {
    console.log("Modal 3 closed");
  },
});

// Thiết lập nội dung footer
// modal3.setFooterContent("<h2>Footer content</h2>");

modal3.addFooterButton("Danger", "modal-btn danger pull-left", (e) => {
  alert("Danger clicked!");
});

modal3.addFooterButton("Cancel", "modal-btn", (e) => {
  modal3.close();
});

modal3.addFooterButton("<span>Agree</span>", "modal-btn primary", (e) => {
  // Something...
  modal3.close();
});
// Mở modal
modal3.open();
