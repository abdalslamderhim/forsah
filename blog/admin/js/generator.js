document.getElementById("generateBtn").addEventListener("click", generateHTML);

function generateHTML() {

    const title = document.getElementById("title").value;
    const slug = document.getElementById("slug").value;
    const image = document.getElementById("image").value;
    const description = document.getElementById("metaDescription").value;
    const keywords = document.getElementById("keywords").value;
    const author = document.getElementById("author").value;

    const content = quill.root.innerHTML;

    const today = new Date().toLocaleDateString("ar");

    const url = `https://abdalslamderhim.github.io/forsah/blog/${slug}.html`;

    let html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width,initial-scale=1">

<title>${title}</title>

<meta name="description" content="${description}">

<meta name="keywords" content="${keywords}">

<meta name="author" content="${author}">

<link rel="canonical" href="${url}">

<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">

</head>

<body>

<header>

<h1>${title}</h1>

<p>آخر تحديث: ${today}</p>

</header>

<main>

<img src="${image}" alt="${title}" style="max-width:100%;border-radius:10px;">

${content}

</main>

<footer>

<hr>

<p>© Forsah</p>

</footer>

</body>

</html>`;

    downloadFile(slug + ".html", html);

}

function downloadFile(filename, text){

    const element = document.createElement("a");

    element.setAttribute("href","data:text/html;charset=utf-8," + encodeURIComponent(text));

    element.setAttribute("download", filename);

    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);

}
