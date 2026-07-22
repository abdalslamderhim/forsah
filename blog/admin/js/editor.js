// تشغيل محرر Quill
const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'ابدأ بكتابة المقال هنا...',
    modules: {
        toolbar: '#toolbar'
    }
});

// إنشاء Slug تلقائيًا
const titleInput = document.getElementById("title");
const slugInput = document.getElementById("slug");

function createSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

titleInput.addEventListener("input", () => {
    slugInput.value = createSlug(titleInput.value);
});

// زر المعاينة
document.getElementById("previewBtn").addEventListener("click", () => {

    const win = window.open("", "_blank");

    win.document.write(`
        <html dir="rtl">
        <head>
            <title>${titleInput.value}</title>
            <style>
                body{
                    font-family:Cairo,Arial;
                    max-width:900px;
                    margin:auto;
                    padding:40px;
                    line-height:2;
                }
                h1{
                    color:#0B2A4A;
                }
            </style>
        </head>
        <body>

            <h1>${titleInput.value}</h1>

            ${quill.root.innerHTML}

        </body>
        </html>
    `);

});

// سيضيف generator.js وظيفة إنشاء HTML لاحقًا
