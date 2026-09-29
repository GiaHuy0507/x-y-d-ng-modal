const $ = document.querySelector.bind(document);
// $ = tìm 1 phần tử

const $$ = document.querySelectorAll.bind(document);
// $$ = tìm nhiều phần tử

// ======================================================
// LƯU DANH SÁCH CÁC MODAL ĐANG ĐƯỢC MỞ
// ======================================================

// Dùng để biết modal nào đang mở cuối cùng.
// Modal cuối cùng trong mảng = modal đang nằm trên cùng.
Modal.elements = [];

function Modal(options = {}) {
  // ==================================================
  // DESTRUCTURING OPTIONS
  // ==================================================

  const {
    templateId,

    // true: đóng modal thì xóa khỏi DOM
    // false: đóng modal nhưng giữ lại DOM
    destroyOnClose = true,

    // Có tạo footer hay không
    footer = false,

    // Các class CSS thêm cho modal-container
    cssClass = [],

    // Các cách cho phép đóng modal
    closeMethods = ["button", "overlay", "escape"],

    // Callback chạy khi modal mở xong
    onOpen,

    // Callback chạy khi modal đóng xong
    onClose,
  } = options;

  // ==================================================
  // TÌM TEMPLATE
  // ==================================================

  // Ví dụ:
  // templateId = "modal-1"
  //
  // => tìm:
  // <template id="modal-1">

  const template = $(`#${templateId}`);

  // Nếu không tìm thấy template
  if (!template) {
    console.error(`#${templateId} does not exist!`);
    return;
  }

  // ==================================================
  // XÁC ĐỊNH CÁCH ĐÓNG MODAL
  // ==================================================

  // Kiểm tra closeMethods có chứa "button" hay không
  this._allowButtonClose = closeMethods.includes("button");

  // Kiểm tra có cho click overlay để đóng không
  this._allowBackdropClose = closeMethods.includes("overlay");

  // Kiểm tra có cho phím Escape để đóng không
  this._allowEscapeClose = closeMethods.includes("escape");

  // ==================================================
  // GET SCROLLBAR WIDTH
  // ==================================================

  // Đo độ rộng thanh scrollbar.
  //
  // Khi modal mở:
  // body sẽ bị overflow hidden
  // => scrollbar biến mất
  //
  // Vì vậy nội dung có thể bị lệch.
  //
  // Ta thêm padding-right bằng độ rộng scrollbar
  // để tránh giao diện bị giật.

  function getScrollbarWidth() {
    // Nếu đã đo trước đó thì dùng lại kết quả
    if (getScrollbarWidth.value) {
      return getScrollbarWidth.value;
    }

    const div = document.createElement("div");

    Object.assign(div.style, {
      overflow: "scroll",
      position: "absolute",
      top: "-9999px",
    });

    document.body.appendChild(div);

    // offsetWidth = bao gồm scrollbar
    // clientWidth = không bao gồm scrollbar
    const scrollbarWidth = div.offsetWidth - div.clientWidth;

    document.body.removeChild(div);

    // Lưu kết quả để lần sau không phải đo lại
    getScrollbarWidth.value = scrollbarWidth;

    return scrollbarWidth;
  }

  // ==================================================
  // _BUILD
  // ==================================================

  // Hàm này dùng để XÂY DỰNG modal.

  this._build = () => {
    // Lấy nội dung bên trong <template>
    //
    // cloneNode(true)
    // => clone toàn bộ nội dung bên trong template

    const content = template.content.cloneNode(true);

    // ----------------------------------------------
    // TẠO BACKDROP
    // ----------------------------------------------

    this._backdrop = document.createElement("div");

    this._backdrop.className = "modal-backdrop";

    // ----------------------------------------------
    // TẠO CONTAINER
    // ----------------------------------------------

    const container = document.createElement("div");

    container.className = "modal-container";

    // ----------------------------------------------
    // THÊM CLASS CSS TÙY CHỈNH
    // ----------------------------------------------

    cssClass.forEach((className) => {
      if (typeof className === "string") {
        container.classList.add(className);
      }
    });

    // ----------------------------------------------
    // TẠO NÚT CLOSE
    // ----------------------------------------------

    if (this._allowButtonClose) {
      const closeBtn = document.createElement("button");

      closeBtn.className = "modal-close";

      closeBtn.innerHTML = "&times;";

      container.append(closeBtn);

      // Click button => đóng modal
      closeBtn.onclick = () => this.close();
    }

    // ----------------------------------------------
    // TẠO MODAL CONTENT
    // ----------------------------------------------

    const modalContent = document.createElement("div");

    modalContent.className = "modal-content";

    // Đưa nội dung template vào modal-content
    modalContent.append(content);

    // Đưa modal-content vào container
    container.append(modalContent);

    // ==================================================
    // FOOTER
    // ==================================================

    if (footer) {
      // Tạo footer
      this._modalFooter = document.createElement("div");

      this._modalFooter.className = "modal-footer";

      // Nếu đã có nội dung footer
      // thì đưa nội dung vào footer
      if (this._footerContent) {
        this._modalFooter.innerHTML = this._footerContent;
      }

      // Đưa tất cả button đã tạo vào footer
      this._footerButtons.forEach((button) => {
        this._modalFooter.append(button);
      });

      // Đưa footer vào container
      container.append(this._modalFooter);
    }

    // ----------------------------------------------
    // GHÉP CÁC PHẦN LẠI
    // ----------------------------------------------

    // container nằm trong backdrop
    this._backdrop.append(container);

    // backdrop nằm trong body
    document.body.append(this._backdrop);
  };

  // ==================================================
  // SET FOOTER CONTENT
  // ==================================================

  // Dùng để thay đổi nội dung footer

  this.setFooterContent = (html) => {
    this._footerContent = html;

    // Nếu footer đã tồn tại trên DOM
    // thì cập nhật ngay
    if (this._modalFooter) {
      this._modalFooter.innerHTML = html;
    }
  };

  // ==================================================
  // FOOTER BUTTONS
  // ==================================================

  // Mảng lưu các button của footer
  this._footerButtons = [];

  // Hàm tạo button footer

  this.addFooterButton = (title, cssClass, callback) => {
    const button = document.createElement("button");

    button.className = cssClass;

    button.innerHTML = title;

    // Khi click button
    // => chạy callback
    button.onclick = callback;

    // Lưu button vào mảng
    this._footerButtons.push(button);
  };

  // ==================================================
  // OPEN
  // ==================================================

  this.open = () => {
    // Thêm modal hiện tại vào danh sách modal đang mở
    //
    // Modal mở sau sẽ nằm cuối mảng
    // => được coi là modal trên cùng.

    Modal.elements.push(this);

    // Nếu modal chưa được xây dựng
    // thì xây dựng trước

    if (!this._backdrop) {
      this._build();
    }

    // Đợi DOM cập nhật rồi mới thêm class show
    // để CSS transition hoạt động

    setTimeout(() => {
      this._backdrop.classList.add("show");
    }, 0);

    // Khóa scroll của body
    document.body.classList.add("no-scroll");

    // Bù lại khoảng scrollbar đã mất
    document.body.style.paddingRight = getScrollbarWidth() + "px";

    // ==================================================
    // CLICK OVERLAY
    // ==================================================

    if (this._allowBackdropClose) {
      this._backdrop.onclick = (e) => {
        // Chỉ đóng khi click đúng backdrop
        //
        // Nếu click container/content
        // thì không đóng.

        if (e.target === this._backdrop) {
          this.close();
        }
      };
    }

    // ==================================================
    // ESCAPE
    // ==================================================

    if (this._allowEscapeClose) {
      // Lắng nghe phím Escape
      document.addEventListener("keydown", this._handleEscapeKey);
    }

    // ==================================================
    // ON OPEN
    // ==================================================

    // Chờ transition mở modal kết thúc
    // rồi gọi onOpen

    this._onTransitionEnd(() => {
      if (typeof onOpen === "function") {
        onOpen();
      }
    });

    // Trả về backdrop
    //
    // => bên ngoài có thể tìm phần tử
    // bên trong modal.

    return this._backdrop;
  };

  // ==================================================
  // XỬ LÝ PHÍM ESCAPE
  // ==================================================

  this._handleEscapeKey = (e) => {
    // Lấy modal cuối cùng trong mảng
    // => modal đang nằm trên cùng

    const lastModal = Modal.elements[Modal.elements.length - 1];

    // Chỉ modal trên cùng mới được đóng
    if (e.key === "Escape" && this === lastModal) {
      this.close();
    }
  };

  // ==================================================
  // ON TRANSITION END
  // ==================================================

  // Chạy callback sau khi CSS transition kết thúc

  this._onTransitionEnd = (callback) => {
    this._backdrop.ontransitionend = (e) => {
      // Chỉ xử lý transition của transform
      if (e.propertyName !== "transform") {
        return;
      }

      // Nếu callback là function
      // thì gọi callback

      if (typeof callback === "function") {
        callback();
      }
    };
  };

  // ==================================================
  // CLOSE
  // ==================================================

  this.close = (destroy = destroyOnClose) => {
    // Xóa modal hiện tại khỏi danh sách modal đang mở
    Modal.elements.pop();

    // Xóa class show
    // => CSS bắt đầu transition đóng

    this._backdrop.classList.remove("show");

    // Nếu cho phép ESC
    // thì phải remove event listener

    if (this._allowEscapeClose) {
      document.removeEventListener("keydown", this._handleEscapeKey);
    }

    // Chờ transition đóng hoàn thành

    this._onTransitionEnd(() => {
      // Nếu destroy = true
      // => xóa modal khỏi DOM

      if (this._backdrop && destroy) {
        this._backdrop.remove();

        // Đặt lại null
        // để lần open sau có thể _build() lại

        this._backdrop = null;

        this._modalFooter = null;
      }

      // ==================================================
      // XỬ LÝ SCROLL
      // ==================================================

      // Chỉ mở lại scroll khi
      // KHÔNG CÒN modal nào đang mở

      if (!Modal.elements.length) {
        document.body.classList.remove("no-scroll");

        document.body.style.paddingRight = "";
      }

      // Callback khi modal đóng xong

      if (typeof onClose === "function") {
        onClose();
      }
    });
  };

  // ==================================================
  // DESTROY
  // ==================================================

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

  // Đóng modal nhưng KHÔNG xóa khỏi DOM
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

  // Có thể giới hạn cách đóng
  // closeMethods: ["button", "overlay", "escape"],

  // Thêm class CSS cho container
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
      // Ngăn form reload trang
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

  // Chỉ cho phép đóng bằng Escape
  closeMethods: ["escape"],

  // Cho phép tạo footer
  footer: true,

  onOpen: () => {
    console.log("Modal 3 opened");
  },

  onClose: () => {
    console.log("Modal 3 closed");
  },
});

// ======================================================
// FOOTER
// ======================================================

// Có thể đặt nội dung HTML cho footer
// modal3.setFooterContent("<h2>Footer content</h2>");

// Button Danger
modal3.addFooterButton("Danger", "modal-btn danger pull-left", (e) => {
  alert("Danger clicked!");
});

// Button Cancel
modal3.addFooterButton("Cancel", "modal-btn", (e) => {
  modal3.close();
});

// Button Agree
modal3.addFooterButton("<span>Agree</span>", "modal-btn primary", (e) => {
  // Xử lý khi Agree
  modal3.close();
});

// ======================================================
// MỞ MODAL 3
// ======================================================

$("#open-modal-3").onclick = () => {
  modal3.open();
};
