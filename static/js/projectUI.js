  
    var APICalls = new API();

    
    const fileUpload = document.querySelector(".fileUpload");
    const Files = document.getElementById("Files");
    const Output = document.getElementById("Output");
    const TextFeild = document.getElementById("TextFeild");
    const Drop = document.getElementById("Drop");
    const SideBar = document.getElementById("SideBar");

    const uploadBtn = document.getElementById("FileUploadButton");
    const fileBtn = document.getElementById("FileButton");
    const previewBtn = document.getElementById("PreviewButton");

    window.chooseFiles = function(){
        fileUpload.click();
    };

    fileUpload.addEventListener("change", () => {
        for(let i = 0; i < fileUpload.files.length; i++){
            console.log("Drag and Drop: " + i);
            if(fileUpload.files[i].type == "application/pdf"){
                APICalls.fileList.push(fileUpload.files[i]);
            }
        }
        Drop.refreshFileList();
    });

    // ================= UPLOAD =================
    uploadBtn.type = "button"; // fix submit bug

    uploadBtn.addEventListener("click", async (e) => {
        console.log("Clocked Button");
        e.preventDefault();
        console.log("FileListLength: " + APICalls.fileList.length)
        for(var i = 0; i < APICalls.fileList.length; i++){
            console.log(i);
            if(!APICalls.fileUploaded[i]){
                console.log()
                
                const contractID = await APICalls.uploadFiles(i);
                console.log("fetchingRedflags " + i);
                await APICalls.fetchRedFlags(contractID, i);

                if(TextFeild.value.trim().length > 0){
                    await APICalls.promptModelWithText();
                }
                
                APICalls.fileUploaded.push(1);
            }
        }
        SideBar.updateUI();
    });

    // ================= Button EL =================
    previewBtn.addEventListener("click", () => {
        if(previewBtn.children[0].innerHTML === "clear"){
            previewBtn.children[0].innerHTML = "menu";
            FullScreenViewer.classList.add("closed");
            redWheelDisable = false;
            whiteWheelDisable = false;
        }
        if(SideBar.isOpened()){
            SideBar.close();
        }else{
            SideBar.open();
        }
    });

    TextFeild.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey){
            e.preventDefault();

            uploadBtn.click();
            APICalls.promptModelWithText();
        }
    });

    
    fileBtn.addEventListener("click", (e) => {
        console.log("click");
        Drop.toggleView();
    });

    // ================= DRAG DROP EL =================
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        Drop.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        Drop.addEventListener(eventName, () => {
            Drop.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        Drop.addEventListener(eventName, () => {
            Drop.classList.remove('drag-over');
        }, false);
    });

    // ================= CHAT UI =================
    Output.appendUserMessage = function(text){
        const div = document.createElement("div");
        div.className = "userdiv";

        const p = document.createElement("p");
        p.className = "usertext";
        p.innerText = text;

        div.appendChild(p);
        this.appendChild(div);
        this.scrollTop = this.scrollHeight;
    }
    Output.appendModelResponse = function(text){
        console.log("MODEL:", text);

        const div = document.createElement("div");
        div.className = "modeldiv";

        const p = document.createElement("p");
        p.className = "modeltext";
        p.innerHTML = text;

        div.appendChild(p);
        this.appendChild(div);

        this.scrollTop = this.scrollHeight;
    }

    // ================= SIDEBAR =================
    SideBar.open = function(){
        SideBar.classList.remove("closed");
        SideBar.classList.add("opened");
        previewBtn.classList.remove("inactive");
        previewBtn.classList.add("active");
    };

    SideBar.close = function(){
        SideBar.classList.remove("opened");
        SideBar.classList.add("closed");
        previewBtn.classList.remove("active");
        previewBtn.classList.add("inactive");
    };
    SideBar.isOpened = function(){
        return SideBar.classList.contains("opened") ? true : false ;
    };

    SideBar.isClosed = function(){
        return SideBar.classList.contains("closed") ? true : false ;
    };

    SideBar.addFile = function(name, file, fileIndex){
        const div = document.createElement("div");
        div.className = "filePreview";

        const canvas = document.createElement("canvas");
        canvas.className = "EmbeddedPDF";

        const p = document.createElement("p");
        p.innerText = name;
        p.classList.add("PreviewTitle");

        const flag = document.createElement("p");
        flag.innerHTML = "flag";
        flag.classList.add("FlagIcon");

        const rFlagCount = document.createElement("p");
        rFlagCount.innerHTML = APICalls.fileFlagStorageList[fileIndex].length;
        console.log("rFlagCount: " + rFlagCount.innerHTML);
        rFlagCount.classList.add("previewRflagCount");

        const wFlagCount = document.createElement("p");
        wFlagCount.innerHTML = (APICalls.fileWhiteFlagStorageList[fileIndex] || []).length;
        console.log("wFlagCount: " + wFlagCount.innerHTML);
        wFlagCount.classList.add("previewWflagCount");

        div.appendChild(rFlagCount);
        div.appendChild(wFlagCount);

        const index = SideBar.childElementCount - 1;

        div.appendChild(flag);
        flag.addEventListener("click", (e) =>{
            SideBar.close();
            previewBtn.children[0].innerHTML = "clear";
            FullScreenViewer.classList.remove("closed");
            FullScreenViewerTitle.innerHTML = name;
            FullScreenViewerPDF.setPDF(file);
            console.log("indes: " + index);
            console.log("Flags: " + APICalls.fileFlagStorageList[index]);
            APICalls.currentFile = index;
            redFlagsBody.innerHTML = "";
            for(var i = 0; i < APICalls.fileFlagStorageList[index].length; i++){
                console.log(APICalls.fileFlagStorageList[index][i]);
                const currentFlag = { ...APICalls.fileFlagStorageList[index][i] };
                redFlagsBody.addFlag(currentFlag);
            }
            whiteFlagsBody.innerHTML = "";
            const whiteList = APICalls.fileWhiteFlagStorageList[index] || [];
            for (var w = 0; w < whiteList.length; w++) {
                whiteFlagsBody.addFlag({ ...whiteList[w] });
            }
            const contractStats = APICalls.contractStats[index];
            console.log(contractStats);
            FullScreenViewerTitle.innerHTML += `
                <div class="contract-stats-inline">
                    <span><strong>${contractStats.chunk_count}</strong> chunks</span>
                    <span><strong>${contractStats.embedding_dim}</strong> dims</span>
                    <span><strong>${contractStats.text_length}</strong> chars</span>
                </div>
            `;
            redFlags.scroller = createScroller(redFlagsBody);
            whiteFlags.scroller = createScroller(whiteFlagsBody);
        });

        div.appendChild(p);
        div.appendChild(canvas);
        SideBar.appendChild(div);

        const pdfjsLib = window['pdfjs-dist/build/pdf'];

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const fileURL = URL.createObjectURL(file);

        let pdfDoc = null;
        let currentPage = 1;

        function renderPage(pageNum){
            pdfDoc.getPage(pageNum).then(page => {
                const scale = 1.2;
                const viewport = page.getViewport({ scale });

                const context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                page.render({
                    canvasContext: context,
                    viewport: viewport
                });
            });
        }
        
        pdfjsLib.getDocument(fileURL).promise.then(pdf => {
            pdfDoc = pdf;          // <-- STORE IT HERE
            renderPage(currentPage);
        });

        canvas.addEventListener("wheel", (e) => {
        if (!pdfDoc) return;

        if (e.deltaY > 10 && currentPage < pdfDoc.numPages) {
            currentPage++;
            renderPage(currentPage);
        } else if (e.deltaY < -10 && currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
        });
    };
    SideBar.addFakeFile = function(){
        const div = document.createElement("div");
        div.className = "fileFakePreview";
        SideBar.appendChild(div);
    }
    SideBar.updateUI = function(){
        const firstChild = this.firstElementChild;

        this.innerHTML = "";

        if (firstChild) {
            this.appendChild(firstChild);
        }

        APICalls.fileList.forEach((file, index) => {
            this.addFile(file.name, file, index);
        });

        if (APICalls.fileList.length % 2 === 1) {
            //SideBar.addFakeFile();
        }

        this.open();
    }
    // ================= DROP =================
    Drop.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        fileUpload.files = files;

        for(let i = 0; i < files.length; i++){
            APICalls.fileList.push(files[i]);
        }

        APICalls.currentFile = APICalls.fileList.length;
        Drop.refreshFileList();
    });

    Drop.isClosed = function(){
        return Drop.classList.contains("closed") ? true : false ;
    }
    Drop.isOpened = function(){
        return Drop.classList.contains("opened") ? true : false ;
    }

    Drop.toggleView = function(){
        Drop.style.transition = ".1s";
        Drop.refreshFileList();
        console.log("click2");
        if(Drop.isClosed()){
            Drop.open();
            console.log("click3");
        }else{
            Drop.close();
            console.log("click4");
        }
        setTimeout(() => {
            Drop.style.transition = ".7s";
        }, 100);
    }
    
    Drop.close = function(){
        Drop.classList.remove("opened");
        Drop.classList.add("closed");
        fileBtn.classList.remove("active");
        fileBtn.classList.add("inactive");
    }
    Drop.open = function(){
        Drop.classList.remove("closed");
        Drop.classList.add("opened");
        fileBtn.classList.remove("inactive");
        fileBtn.classList.add("active");
    }

    Drop.refreshFileList = function(){
        Files.innerHTML = "";

        APICalls.fileList.forEach((file, index) => {
            const div = document.createElement("div");

            const text = document.createElement("p");
            text.style.margin = "0px";
            text.innerText = file.name;

            const button = document.createElement("button");
            button.textContent = "clear";
            button.className = "RemoveFileButton material-symbols-outlined";

            if(index < APICalls.fileUploaded.length){
                button.disabled = true;
            }

            button.onclick = () => {

                APICalls.contractIds.splice(index, 1);
                APICalls.contractStats.splice(index, 1);
                APICalls.fileList.splice(index, 1);
                APICalls.fileUploaded.splice(index, 1);
                APICalls.filePreviewList.splice(index, 1);
                APICalls.fileFlagStorageList.splice(index, 1);
                 
                APICalls.currentFile = APICalls.fileList.length;
                Drop.refreshFileList();
            };

            div.appendChild(text);
            div.appendChild(button);
            Files.appendChild(div);
        });
    }

const FullScreenViewer = document.getElementById("FullScreenViewer");
const FullScreenViewerTitle = document.getElementById("FullScreenViewerTitle");
const FullScreenViewerPDF = document.getElementById("FullScreenViewerPDF");
const FullScreenViewerFlags = document.getElementById("FullScreenViewerFlags");

function normalizePdfSearchText(str) {
    if (!str || typeof str !== "string") return "";
    return str
        .toLowerCase()
        .replace(/[\u2013\u2014\-_/]+/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateSearchPhrase(s, maxLen) {
    if (!s) return "";
    s = String(s).trim();
    if (s.length <= maxLen) return s;
    s = s.slice(0, maxLen);
    var cut = s.lastIndexOf(" ");
    if (cut > maxLen * 0.35) s = s.slice(0, cut);
    return s.trim();
}

function firstCompleteSentenceFromExcerpt(text) {
    if (!text || !String(text).trim()) return "";
    var t = String(text).trim();
    var m = t.match(/^([\s\S]+?[.!?])(\s+|$)/);
    if (m) return m[1].trim();
    return truncateSearchPhrase(t, 160);
}

function splitChunkLikeSentences(chunk) {
    if (!chunk) return [];
    return String(chunk)
        .split(/(?<=[.!?])\s+/)
        .map(function (x) {
            return x.trim();
        })
        .filter(Boolean);
}

function bestSentenceFromChunkForFlag(flag) {
    var chunk = flag.chunk_text || "";
    if (!String(chunk).trim()) return "";
    var sents = splitChunkLikeSentences(chunk);
    if (!sents.length) return truncateSearchPhrase(chunk, 200);
    var stop = {
        the: 1,
        and: 1,
        or: 1,
        to: 1,
        of: 1,
        in: 1,
        for: 1,
        on: 1,
        with: 1,
        a: 1,
        an: 1,
        may: 1,
        will: 1,
        shall: 1,
        party: 1,
        parties: 1,
        agreement: 1,
        this: 1,
        that: 1,
        any: 1,
        all: 1,
    };
    var raw = [flag.title, flag.category, flag.explanation, flag.match_text || ""].join(" ");
    var words = normalizePdfSearchText(raw).split(/\s+/).filter(function (w) {
        return w.length > 2 && !stop[w];
    });
    var seenW = {};
    var keywords = [];
    for (var i = 0; i < words.length && keywords.length < 24; i++) {
        if (!seenW[words[i]]) {
            seenW[words[i]] = 1;
            keywords.push(words[i]);
        }
    }
    var best = "";
    var bestScore = -1;
    for (var s = 0; s < sents.length; s++) {
        var ns = normalizePdfSearchText(sents[s]);
        var score = 0;
        for (var k = 0; k < keywords.length; k++) {
            if (ns.indexOf(keywords[k]) !== -1) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            best = sents[s];
        }
    }
    if (bestScore <= 0) {
        var mtn = normalizePdfSearchText(flag.match_text || "");
        var mw = mtn.split(/\s+/).filter(function (w) {
            return w.length > 3;
        });
        mw = mw.slice(0, 10);
        for (var s2 = 0; s2 < sents.length; s2++) {
            var ns2 = normalizePdfSearchText(sents[s2]);
            var sc = 0;
            for (var m = 0; m < mw.length; m++) {
                if (ns2.indexOf(mw[m]) !== -1) sc++;
            }
            if (sc > bestScore) {
                bestScore = sc;
                best = sents[s2];
            }
        }
    }
    if (!best) best = sents[0];
    return truncateSearchPhrase(best, 220);
}

function excerptMidShortPhrases(excerpt, addLabeled) {
    if (!excerpt) return;
    var words = String(excerpt)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length <= 12) {
        addLabeled("excerpt_short", words.join(" "));
        return;
    }
    for (var len = 12; len >= 6; len--) {
        addLabeled("excerpt_phrase_start", words.slice(0, len).join(" "));
        var mid = Math.max(0, Math.floor((words.length - len) / 2));
        addLabeled("excerpt_phrase_mid", words.slice(mid, mid + len).join(" "));
        addLabeled("excerpt_phrase_end", words.slice(words.length - len).join(" "));
        break;
    }
}

function keyPhraseFromFlagMeta(flag) {
    var raw = [flag.title, flag.category, flag.explanation].filter(Boolean).join(" ");
    var w = normalizePdfSearchText(raw)
        .split(/\s+/)
        .filter(function (x) {
            return x.length > 3;
        });
    return w.slice(0, 12).join(" ");
}

function isWhiteFlagDataObject(x) {
    return x && typeof x === "object" && !Array.isArray(x) && x.id !== undefined && x.status !== undefined;
}

/** Ordered {label, text} for PDF text-layer search; highlight_text first (from API). */
function buildFlagSearchCandidates(flag) {
    var out = [];
    var seen = new Set();
    function addLabeled(label, s) {
        if (!s || typeof s !== "string") return;
        var t = s.trim();
        if (t.length < 4) return;
        var k = normalizePdfSearchText(t);
        if (k.length < 4) return;
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ label: label, text: t });
    }

    function addCitationSearch(label, s) {
        if (!s || typeof s !== "string") return;
        var t = truncateSearchPhrase(s.trim(), 220);
        if (t.length < 2) return;
        var k = normalizePdfSearchText(t);
        if (k.length < 2) return;
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ label: label, text: t });
    }

    addLabeled("highlight_text", flag.highlight_text ? String(flag.highlight_text) : "");
    addLabeled("white_best_match", flag.best_match ? String(flag.best_match) : "");
    addLabeled("white_expected_clause", flag.expected_clause ? String(flag.expected_clause) : "");
    addCitationSearch("citation_quote", flag.citation_quote ? String(flag.citation_quote) : "");
    addLabeled("match_text", truncateSearchPhrase(flag.match_text ? String(flag.match_text) : "", 180));

    var ex = flag.excerpt ? String(flag.excerpt) : "";
    if (ex) {
        addLabeled("excerpt", ex.length > 160 ? truncateSearchPhrase(ex, 160) : ex);
        addLabeled("excerpt_first_sentence", firstCompleteSentenceFromExcerpt(ex));
        excerptMidShortPhrases(ex, addLabeled);
    }

    addLabeled("meta_title_category_explanation", keyPhraseFromFlagMeta(flag));
    addLabeled("chunk_best_sentence", bestSentenceFromChunkForFlag(flag));

    var ch = flag.chunk_text ? String(flag.chunk_text) : "";
    if (ch.length > 240) {
        addLabeled("chunk_text_truncated", truncateSearchPhrase(ch, 200));
    } else if (ch) {
        addLabeled("chunk_text", ch);
    }

    return out;
}

function isRedFlagDataObject(x) {
    return (
        x &&
        typeof x === "object" &&
        !Array.isArray(x) &&
        (x.chunk_id !== undefined || (x.title !== undefined && x.severity !== undefined))
    );
}

function formatFlagExcerptHtml(excerpt) {
    return (excerpt || "")
        .replace(/^### (.*$)/gim, "<h4 style=\"margin:3px;\">$1</h4>")
        .replace(/^---\s*$/gim, "<hr>");
}

function escapeHtmlText(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function buildRedFlagCardHtml(flag) {
    const formattedExcerpt = formatFlagExcerptHtml(flag.excerpt || "");
    const sevColor = APICalls.severities[flag.severity] || "black";
    var cq = (flag.citation_quote && String(flag.citation_quote).trim()) || "";
    var citationBlock = "";
    if (cq) {
        var metaLine = "";
        var parts = [];
        if (flag.citation_section) parts.push("Section: " + escapeHtmlText(flag.citation_section));
        if (flag.citation_page != null && flag.citation_page !== "")
            parts.push("Page: " + escapeHtmlText(String(flag.citation_page)));
        if (flag.citation_chunk_id && !flag.citation_section && flag.citation_page == null)
            parts.push("Chunk: " + escapeHtmlText(String(flag.citation_chunk_id)));
        if (parts.length) metaLine = `<div class="red-flag-citation-meta">${parts.join(" · ")}</div>`;
        citationBlock =
            `<div class="red-flag-citation">` +
            `<div class="red-flag-citation-label">Citation</div>` +
            `<div class="red-flag-citation-quote">“${escapeHtmlText(cq)}”</div>` +
            metaLine +
            `</div>`;
    }
    return (
        `<span class="red-flag-card-title">${flag.title}</span><br>` +
        `<span>Severity: <span style="color: ${sevColor};">${flag.severity}</span></span><br>` +
        `<span>${flag.explanation}</span><br>` +
        citationBlock +
        `<span>${formattedExcerpt}</span>`
    );
}

function buildWhiteFlagCardHtml(flag) {
    const sevColor = APICalls.severities[flag.severity] || "#4f6078";
    const statusClass = (flag.status || "").toLowerCase() === "missing" ? "status-missing" : "status-weak";
    var reference = "";
    if ((flag.best_match || "").trim()) {
        reference =
            `<div class="white-flag-reference">` +
            `<div class="white-flag-reference-label">Reference</div>` +
            `<div class="white-flag-reference-quote">“${escapeHtmlText(flag.best_match)}”</div>` +
            `</div>`;
    }
    return (
        `<span class="white-flag-card-title">${escapeHtmlText(flag.title)}</span><br>` +
        `<span>Severity: <span style="color: ${sevColor};">${escapeHtmlText(flag.severity)}</span></span><br>` +
        `<span>Status: <span class="white-flag-status ${statusClass}">${escapeHtmlText(flag.status)}</span></span><br>` +
        `<span>${escapeHtmlText(flag.explanation || "")}</span>` +
        reference
    );
}
const redFlags = document.getElementById("redFlags");
const whiteFlags = document.getElementById("whiteFlags");

const redFlagsBody = document.getElementById("redFlagsBody");
const whiteFlagsBody = document.getElementById("whiteFlagsBody");
const redFlagsTitle = document.getElementById("redFlagsTitle");
const whiteFlagsTitle = document.getElementById("whiteFlagsTitle");

function pdfUnionBounds(rects) {
    return {
        left: Math.min.apply(
            null,
            rects.map(function (r) {
                return r.left;
            })
        ),
        top: Math.min.apply(
            null,
            rects.map(function (r) {
                return r.top;
            })
        ),
        right: Math.max.apply(
            null,
            rects.map(function (r) {
                return r.right;
            })
        ),
        bottom: Math.max.apply(
            null,
            rects.map(function (r) {
                return r.bottom;
            })
        ),
    };
}

function pdfAppendManualTextSpans(pdfjsLib, container, textContent, viewport) {
    textContent.items.forEach(function (item) {
        if (!("str" in item) || !item.str) return;
        var span = document.createElement("span");
        span.textContent = item.str;
        span.setAttribute("role", "presentation");
        var m = pdfjsLib.Util.transform(viewport.transform, item.transform);
        var fontHeight = Math.hypot(m[2], m[3]) || 12;
        span.style.position = "absolute";
        span.style.left = m[4] + "px";
        span.style.top = m[5] - fontHeight + "px";
        span.style.fontSize = fontHeight + "px";
        span.style.lineHeight = "1";
        span.style.whiteSpace = "pre";
        span.style.transformOrigin = "0 0";
        container.appendChild(span);
    });
}

async function pdfFillTextLayer(pdfjsLib, page, viewport, textLayerDiv) {
    textLayerDiv.className = "textLayer";
    textLayerDiv.style.width = viewport.width + "px";
    textLayerDiv.style.height = viewport.height + "px";
    textLayerDiv.innerHTML = "";
    var textContent = await page.getTextContent({ normalizeWhitespace: false });
    var textDivs = [];
    var done = false;
    try {
        if (typeof pdfjsLib.renderTextLayer === "function") {
            var task = pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: textDivs,
            });
            if (task && task.promise) {
                await task.promise;
                done = textLayerDiv.querySelectorAll("span").length > 0;
            }
        }
    } catch (e) {
        console.warn("[PDF highlight] renderTextLayer failed:", e);
    }
    if (!done) {
        textLayerDiv.innerHTML = "";
        try {
            if (typeof pdfjsLib.renderTextLayer === "function") {
                var task2 = pdfjsLib.renderTextLayer({
                    textContentSource: textContent,
                    container: textLayerDiv,
                    viewport: viewport,
                    textDivs: [],
                });
                if (task2 && task2.promise) {
                    await task2.promise;
                    done = textLayerDiv.querySelectorAll("span").length > 0;
                }
            }
        } catch (e2) {
            console.warn("[PDF highlight] renderTextLayer textContentSource failed:", e2);
        }
    }
    if (!done || textLayerDiv.querySelectorAll("span").length === 0) {
        textLayerDiv.innerHTML = "";
        pdfAppendManualTextSpans(pdfjsLib, textLayerDiv, textContent, viewport);
    }
}

function pdfBuildTextLayerSearchIndex(textLayerDiv) {
    var spans = Array.prototype.slice.call(textLayerDiv.querySelectorAll("span"));
    var norm = "";
    var meta = [];
    spans.forEach(function (span) {
        var raw = span.textContent || "";
        if (!raw.replace(/\s/g, "").length) return;
        var p = normalizePdfSearchText(raw);
        if (!p) return;
        var sep = norm.length ? " " : "";
        var n0 = norm.length + sep.length;
        norm += sep + p;
        meta.push({ span: span, n0: n0, n1: norm.length });
    });
    return { norm: norm, meta: meta };
}

function pdfFindNormMatchWithShrink(normPage, candNorm) {
    var c = candNorm;
    while (c && c.length >= 6) {
        var i = normPage.indexOf(c);
        if (i !== -1) return { index: i, length: c.length };
        var parts = c.split(/\s+/).filter(Boolean);
        if (parts.length <= 2) break;
        parts.pop();
        c = parts.join(" ");
    }
    return null;
}

function pdfCollectSpansForNormRange(index, start, len) {
    var end = start + len;
    var out = [];
    var seen = {};
    index.meta.forEach(function (m) {
        if (m.n1 <= start || m.n0 >= end) return;
        var el = m.span;
        var id = el.__pdfHlId || (el.__pdfHlId = "hl" + Math.random().toString(36).slice(2));
        if (!seen[id]) {
            seen[id] = 1;
            out.push(el);
        }
    });
    out.sort(function (a, b) {
        var ra = a.getBoundingClientRect();
        var rb = b.getBoundingClientRect();
        return ra.top - rb.top || ra.left - rb.left;
    });
    return out;
}

function pdfRectsFromSpansLines(spans, wrapper, margin, maxInnerW, maxH, maxLines) {
    if (!spans.length) return [];
    var wr = wrapper.getBoundingClientRect();
    var raw = spans.map(function (span) {
        var r = span.getBoundingClientRect();
        return {
            left: r.left - wr.left,
            top: r.top - wr.top,
            right: r.right - wr.left,
            bottom: r.bottom - wr.top,
        };
    });
    raw.sort(function (a, b) {
        return a.top - b.top || a.left - b.left;
    });
    var lines = [];
    var bucket = [];
    var lastMid = null;
    for (var i = 0; i < raw.length; i++) {
        var r = raw[i];
        var midY = (r.top + r.bottom) / 2;
        if (lastMid !== null && Math.abs(midY - lastMid) > 6) {
            if (bucket.length) lines.push(pdfUnionBounds(bucket));
            bucket = [];
        }
        bucket.push(r);
        lastMid = midY;
    }
    if (bucket.length) lines.push(pdfUnionBounds(bucket));
    lines = lines.slice(0, maxLines);
    var ucomb = lines.length ? pdfUnionBounds(lines) : null;
    var uh = ucomb ? ucomb.bottom - ucomb.top : 0;
    if (uh > maxH && lines.length > 1) lines = [lines[0]];
    lines = pdfClampRectsWidth(lines, maxInnerW, margin, wr.width);
    lines = pdfMergeOverlappingRects(lines);
    lines = pdfDedupeNearDuplicateRects(lines, 4);
    if (lines.length > 3) lines = lines.slice(0, 3);
    return lines;
}

function pdfRectsOverlap(a, b, eps) {
    eps = eps || 2;
    return !(
        a.right < b.left - eps ||
        a.left > b.right + eps ||
        a.bottom < b.top - eps ||
        a.top > b.bottom + eps
    );
}

function pdfMergeOverlappingRects(rects) {
    if (!rects.length) return [];
    var list = rects.slice();
    var changed = true;
    while (changed) {
        changed = false;
        outer: for (var i = 0; i < list.length; i++) {
            for (var j = i + 1; j < list.length; j++) {
                if (pdfRectsOverlap(list[i], list[j], 3)) {
                    list[i] = pdfUnionBounds([list[i], list[j]]);
                    list.splice(j, 1);
                    changed = true;
                    break outer;
                }
            }
        }
    }
    return list;
}

function pdfRectNearlySame(a, b, eps) {
    return (
        Math.abs(a.left - b.left) < eps &&
        Math.abs(a.top - b.top) < eps &&
        Math.abs(a.right - b.right) < eps &&
        Math.abs(a.bottom - b.bottom) < eps
    );
}

function pdfDedupeNearDuplicateRects(rects, eps) {
    var res = [];
    for (var i = 0; i < rects.length; i++) {
        var dup = false;
        for (var j = 0; j < res.length; j++) {
            if (pdfRectNearlySame(rects[i], res[j], eps)) {
                dup = true;
                break;
            }
        }
        if (!dup) res.push(rects[i]);
    }
    return res;
}

function pdfClampRectsWidth(rects, maxInnerW, margin, pageW) {
    var leftB = margin;
    var rightB = pageW - margin;
    return rects.map(function (r) {
        var w = r.right - r.left;
        var rr = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        if (w > maxInnerW) {
            var mid = (rr.left + rr.right) / 2;
            rr.left = Math.max(leftB, mid - maxInnerW / 2);
            rr.right = Math.min(rightB, rr.left + maxInnerW);
            rr.left = Math.max(leftB, rr.right - maxInnerW);
        } else {
            if (rr.right > rightB) {
                var shift = rr.right - rightB;
                rr.left -= shift;
                rr.right -= shift;
            }
            if (rr.left < leftB) {
                var sh2 = leftB - rr.left;
                rr.left += sh2;
                rr.right += sh2;
            }
        }
        return rr;
    });
}

function pdfDrawHighlightsOnPage(pageView, rects) {
    var layer = pageView.highlightLayer;
    if (!layer) return;
    layer.querySelectorAll(".pdf-highlight-box").forEach(function (n) {
        n.remove();
    });
    layer.innerHTML = "";
    var pad = 2;
    rects.forEach(function (r) {
        var d = document.createElement("div");
        d.className = "pdf-highlight-box";
        d.style.left = r.left - pad + "px";
        d.style.top = r.top - pad + "px";
        d.style.width = r.right - r.left + pad * 2 + "px";
        d.style.height = r.bottom - r.top + pad * 2 + "px";
        layer.appendChild(d);
    });
}

FullScreenViewerPDF.clearHighlights = function () {
    this.querySelectorAll(".pdf-highlight-box").forEach(function (n) {
        n.remove();
    });
    if (this._pageViews) {
        this._pageViews.forEach(function (pv) {
            if (pv.highlightLayer) pv.highlightLayer.innerHTML = "";
        });
    }
};

FullScreenViewerPDF.findFlagLocation = async function (flag) {
    if (!this._pageViews || !this._pageViews.length) return null;
    var candidates = buildFlagSearchCandidates(flag);
    var margin = 8;
    var maxH = 120;
    var maxLines = 3;
    for (var c = 0; c < candidates.length; c++) {
        var entry = candidates[c];
        var label = entry.label;
        var cand = entry.text;
        var cn = normalizePdfSearchText(cand);
        if (cn.length < 5) {
            console.info("[PDF highlight] skip (too short):", label);
            continue;
        }
        for (var p = 0; p < this._pageViews.length; p++) {
            var pv = this._pageViews[p];
            if (!pv.textLayer || !pv._textSearchIndex) {
                console.info("[PDF highlight] no text layer on page", pv.pageNum, "—", label);
                continue;
            }
            var hit = pdfFindNormMatchWithShrink(pv._textSearchIndex.norm, cn);
            if (!hit) {
                console.info("[PDF highlight] no norm match page", pv.pageNum, "—", label);
                continue;
            }
            var spans = pdfCollectSpansForNormRange(pv._textSearchIndex, hit.index, hit.length);
            if (!spans.length) {
                console.info("[PDF highlight] no spans mapped page", pv.pageNum, "—", label);
                continue;
            }
            var maxW = pv.viewport.width - margin * 2;
            var rects = pdfRectsFromSpansLines(spans, pv.wrapper, margin, maxW, maxH, maxLines);
            if (!rects.length) {
                console.info("[PDF highlight] empty rects page", pv.pageNum, "—", label);
                continue;
            }
            var u = pdfUnionBounds(rects);
            if (u.bottom - u.top > maxH + 4 || u.right - u.left > maxW + 8) {
                console.info("[PDF highlight] rects too large page", pv.pageNum, "—", label, "try next");
                continue;
            }
            console.info("[PDF highlight] matched page", pv.pageNum, "via", label);
            return { pageView: pv, rects: rects };
        }
    }
    console.warn("[PDF highlight] all candidates failed for flag:", flag.title || flag.category);
    return null;
};

FullScreenViewerPDF.highlightFlag = async function (flag) {
    try {
        if (this._readyPromise) await this._readyPromise;
    } catch (err) {
        console.warn("[PDF highlight] PDF not ready:", err);
        return false;
    }
    this.clearHighlights();
    var hit = await this.findFlagLocation(flag);
    if (!hit || !hit.rects || !hit.rects.length) {
        return false;
    }
    pdfDrawHighlightsOnPage(hit.pageView, hit.rects);
    if (hit.pageView.wrapper && this._scrollContainer) {
        hit.pageView.wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return true;
};

FullScreenViewerPDF.setPDF = function (file) {
    var pdfjsLib = window["pdfjs-dist/build/pdf"];
    var self = this;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    if (this._lastFileName === file.name) {
        return;
    }
    this._lastFileName = file.name;

    this.innerHTML = "";
    this._pdfDoc = null;
    this._pageViews = [];
    this._scrollContainer = null;

    var container = document.createElement("div");
    container.className = "pdf-scroll-container";
    this.appendChild(container);
    this._scrollContainer = container;

    var fileURL = URL.createObjectURL(file);

    this._readyPromise = pdfjsLib
        .getDocument(fileURL)
        .promise.then(async function (pdf) {
            self._pdfDoc = pdf;
            self._pageViews = [];
            var scale = 1.2;

            for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                var page = await pdf.getPage(pageNum);
                var viewport0 = page.getViewport({ scale: scale });
                var containerWidth = container.clientWidth || self.clientWidth || 600;
                var scaleRatio = containerWidth / viewport0.width;
                var scaledViewport = page.getViewport({ scale: scale * scaleRatio });

                var wrapper = document.createElement("div");
                wrapper.className = "pdf-page-wrapper";

                var canvas = document.createElement("canvas");
                canvas.className = "pdf-page";
                var context = canvas.getContext("2d");
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;

                var textLayer = document.createElement("div");
                textLayer.className = "textLayer";

                var highlightLayer = document.createElement("div");
                highlightLayer.className = "pdf-highlight-layer";

                wrapper.appendChild(canvas);
                wrapper.appendChild(textLayer);
                wrapper.appendChild(highlightLayer);
                container.appendChild(wrapper);

                await page.render({
                    canvasContext: context,
                    viewport: scaledViewport,
                }).promise;

                await pdfFillTextLayer(pdfjsLib, page, scaledViewport, textLayer);
                var pageView = {
                    pageNum: pageNum,
                    page: page,
                    viewport: scaledViewport,
                    canvas: canvas,
                    wrapper: wrapper,
                    textLayer: textLayer,
                    highlightLayer: highlightLayer,
                    _textSearchIndex: pdfBuildTextLayerSearchIndex(textLayer),
                };
                self._pageViews.push(pageView);
            }
            return self._pageViews;
        })
        .catch(function (err) {
            console.error("PDF load error", err);
            throw err;
        });
};

FullScreenViewerFlags.switchFlags = function (x) {

    if (x === "red") {

        FullScreenViewerFlags.classList.remove("white");
        FullScreenViewerFlags.classList.add("red");

        whiteFlagsBody.classList.remove("active");
        whiteFlagsBody.classList.add("inactive");

        redFlagsBody.classList.remove("inactive");
        redFlagsBody.classList.add("active");

        whiteFlagsTitle.classList.remove("active");
        whiteFlagsTitle.classList.add("inactive");

        redFlagsTitle.classList.remove("inactive");
        redFlagsTitle.classList.add("active");

        var child = whiteFlagsBody.querySelector(".active");
        var index = [...child.parentNode.children].indexOf(child);
        setTimeout(() => {
            whiteFlags.scroller.scrollToItem(index);
        }, 300);
        
    }

    else if (x === "white") {

        FullScreenViewerFlags.classList.remove("red");
        FullScreenViewerFlags.classList.add("white");

        redFlagsBody.classList.remove("active");
        redFlagsBody.classList.add("inactive");

        whiteFlagsBody.classList.remove("inactive");
        whiteFlagsBody.classList.add("active");

        redFlagsTitle.classList.remove("active");
        redFlagsTitle.classList.add("inactive");

        whiteFlagsTitle.classList.remove("inactive");
        whiteFlagsTitle.classList.add("active");

    
        var child = redFlagsBody.querySelector(".active");
        var index  = [...child.parentNode.children].indexOf(child);
        setTimeout(() => {
            redFlags.scroller.scrollToItem(index);
        }, 300);

    }
};

redFlags.addEventListener("mouseenter", (e) => {
    FullScreenViewerFlags.switchFlags("red");
});

whiteFlags.addEventListener("mouseenter", (e) => {
    FullScreenViewerFlags.switchFlags("white");
});


function addFlagToBody(flagOrHtml, parent){
    const div = document.createElement("div");
    div.classList.add("flag-panel-card");
    const useObj = isRedFlagDataObject(flagOrHtml);
    const useWhiteObj = isWhiteFlagDataObject(flagOrHtml);
    const html = useObj ? buildRedFlagCardHtml(flagOrHtml) : useWhiteObj
                        ? buildWhiteFlagCardHtml(flagOrHtml) : String(flagOrHtml || "");
    const inner = document.createElement("div");
    inner.className = "red-flag-card-content";
    inner.innerHTML = html;
    div.appendChild(inner);

    const expand = document.createElement("span");
    expand.innerHTML = "keyboard_arrow_down";
    expand.classList.add("expansionIcon");
    div.appendChild(expand);
    if (useObj) {
        div._redFlagData = flagOrHtml;
    }
    if (useWhiteObj) {
        div._whiteFlagData = flagOrHtml;
        div.classList.add("white-flag-card");
    }
    parent.appendChild(div);

    expand.addEventListener("click", (e) =>{
        e.preventDefault();
        e.stopPropagation();
        if(expand.innerHTML === "keyboard_arrow_down" && expand.parentNode.classList.contains("active")){
            expand.innerHTML = "keyboard_arrow_up";
            console.log("RFB HIEGHT: " + redFlagsBody.style.offsetHeight);
            expand.parentNode.style.maxHeight = "calc(100% + 2px)";
            expand.parentNode.style.minHeight = "calc(100% + 2px)";
            expand.parentNode.style.height = "calc(100% + 2px)";
            redWheelDisable = true;
            var index = [...expand.parentNode.parentNode.children].indexOf(expand.parentNode);
            setTimeout(() => {
                redFlags.scroller.scrollToItem(index);
            }, 300);
        }else{
            expand.innerHTML = "keyboard_arrow_down";
            expand.parentNode.style.maxHeight = "calc(132px)";
            expand.parentNode.style.minHeight = "calc(132px)";
            expand.parentNode.style.height = "calc(132px)";
            redWheelDisable = false;
        }
        
    });

    if (useObj && parent.id === "redFlagsBody") {
        div.addEventListener("mouseover", async function (e) {
            if (e.target.closest(".expansionIcon")) return;
            parent.querySelectorAll(".red-flag-card-selected").forEach(function (el) {
                el.classList.remove("red-flag-card-selected", "red-flag-locate-failed");
            });
            div.classList.add("red-flag-card-selected");
            div.classList.remove("red-flag-locate-failed");
            var ok = await FullScreenViewerPDF.highlightFlag(div._redFlagData);
            if (!ok) {
                div.classList.add("red-flag-locate-failed");
                setTimeout(function () {
                    div.classList.remove("red-flag-locate-failed");
                }, 2600);
            }
        });
    }

    if (useWhiteObj && parent.id === "whiteFlagsBody") {
        div.addEventListener("mouseover", async function (e) {
            if (e.target.closest(".expansionIcon")) return;
            parent.querySelectorAll(".white-flag-card-selected").forEach(function (el) {
                el.classList.remove("white-flag-card-selected", "red-flag-locate-failed");
            });
            div.classList.add("white-flag-card-selected");
            div.classList.remove("red-flag-locate-failed");
            var payload = {
                best_match: div._whiteFlagData.best_match,
                expected_clause: div._whiteFlagData.expected_clause,
                title: div._whiteFlagData.title,
                category: div._whiteFlagData.id,
                explanation: div._whiteFlagData.explanation,
            };
            var ok = await FullScreenViewerPDF.highlightFlag(payload);
            if (!ok) {
                if (FullScreenViewerPDF._scrollContainer) {
                    FullScreenViewerPDF._scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
                }
                div.classList.add("red-flag-locate-failed");
                setTimeout(function () {
                    div.classList.remove("red-flag-locate-failed");
                }, 2000);
            }
        });
    }

}

redFlagsBody.addFlag = function(flag){
    addFlagToBody(flag, this);
}

whiteFlagsBody.addFlag = function(flag){
    addFlagToBody(flag, this);
}









var redWheelDisable = false;
var whiteWheelDisable = false;

function createScroller(containerId) {
    const container = containerId;
    const items = Array.from(container.children);

    let activeIndex = 0;
    let velocity = 0;
    let lastWheelTime = 0;

    function isActive(){
        return container.classList.contains("active");
    }

    function scrollToItem(index){
        const el = items[index];
        if (!el) return;

        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const offset =
            (elRect.top - containerRect.top) -
            container.clientHeight / 2 +
            elRect.height / 2;

        const maxScroll = container.scrollHeight - container.clientHeight;

        const target = Math.max(
            0,
            Math.min(container.scrollTop + offset, maxScroll)
        );

        container.scrollTo({
            top: target,
            behavior: "smooth"
        });
    }

    function applyState(index, autoScroll) {
        if (!isActive()) return;

        activeIndex = Math.max(0, Math.min(items.length - 1, index));

        items.forEach((el, i) => {
            el.classList.remove("active", "neighbor");

            const dist = Math.abs(i - activeIndex);

            if (i === activeIndex) {
                el.classList.add("active");
            } else if (dist === 1) {
                el.classList.add("neighbor");
            }
        });
        if(!autoScroll) return;
        requestAnimationFrame(() => {
            scrollToItem(activeIndex);
        });
    }

    // 🚀 SMART WHEEL HANDLING (fixes direction + fast scrolling)
    container.addEventListener("wheel", (e) => {
        if(!redWheelDisable && container == redFlagsBody || !whiteWheelDisable && container == whiteFlagsBody){
            e.preventDefault();
            if(!isActive()){
                return;
            }


            const now = Date.now();
            const dt = now - lastWheelTime;
            lastWheelTime = now;

            // accumulate velocity (important for fast flicks)
            velocity += e.deltaY * (dt < 50 ? 1.2 : 0.8);

            // decay velocity over time
            setTimeout(() => {
                velocity *= 0.7;
            }, 50);

            // determine direction from actual velocity
            let step = 0;

            if (velocity > 40) step = 1;
            if (velocity > 120) step = 2;
            if (velocity < -40) step = -1;
            if (velocity < -120) step = -2;

            if (step !== 0) {
                applyState(activeIndex + step, true);
                velocity = 0; // reset after applying movement
            }
        }
    },{ passive: false });

    let lastX = null;
    let lastY = null;

    items.forEach((element, index) => {
        element.addEventListener("mousemove", (e) =>{
            if (lastX === null) {
                lastX = e.clientX;
                lastY = e.clientY;
                return;
            }
        
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
        
            lastX = e.clientX;
            lastY = e.clientY;
        
            if (
                Math.abs(dy) > Math.abs(dx) &&
                (
                    (!redWheelDisable && container === redFlagsBody) ||
                    (!whiteWheelDisable && container === whiteFlagsBody)
                )
            ) {
                applyState(index, false);
            }
        });
    });

    // init
    requestAnimationFrame(() => {
        applyState(0);
    });

    return {
        applyState,
        scrollToItem,
    };  
}

// init
redFlags.scroller = createScroller(redFlagsBody);
whiteFlags.scroller = createScroller(whiteFlagsBody);






const timeSort = document.getElementById("timeSort");
timeSort.addEventListener("click", (e) =>{
    SideBar.timeSort();
});
const alphaSort = document.getElementById("alphaSort");
alphaSort.addEventListener("click", (e) => {
    SideBar.alphaSort();
});
const redFlagSort = document.getElementById("redFlagSort");
redFlagSort.addEventListener("click", (e) => {
    SideBar.redFlagSort();
});
const whiteFlagSort = document.getElementById("whiteFlagSort");
whiteFlagSort.addEventListener("click", (e) => {
    SideBar.whiteFlagSort();
});
const sortOrder = document.getElementById("sortOrder");
sortOrder.addEventListener("click", (e) => {
    SideBar.sortOrder();
});

SideBar.getChildrenArray = function(){
    return Array.from(SideBar.children).slice(1);;
}

SideBar.reappend = function(children){
    const first = SideBar.children[0];

    SideBar.innerHTML = "";
    SideBar.appendChild(first);

    children.forEach(child => SideBar.appendChild(child));
}

// Alphabetical sort
SideBar.alphaSort = function () {
    let children = SideBar.getChildrenArray();

    children.sort((a, b) => {
        let textA = a.querySelector(".previewTitle").innerHTML.toLowerCase();
        let textB = b.querySelector(".previewTitle").innerHTML.toLowerCase();
        return textA.localeCompare(textB);
    });

    SideBar.reappend(children);
};

// Time sort (assuming APICalls.fileList matches order)
SideBar.timeSort = function () {
    let children = SideBar.getChildrenArray();

    children.sort((a, b) => {
        let indexA = Array.from(SideBar.children).indexOf(a);
        let indexB = Array.from(SideBar.children).indexOf(b);

        let timeA = APICalls.fileList[indexA];
        let timeB = APICalls.fileList[indexB];

        return timeA - timeB;
    });

    SideBar.reappend(children);
};

// Red flag sort
SideBar.redFlagSort = function () {
    let children = SideBar.getChildrenArray();

    children.sort((a, b) => {
        let valA = parseInt(a.querySelector(".previewRflagCount").innerHTML) || 0;
        let valB = parseInt(b.querySelector(".previewRflagCount").innerHTML) || 0;
        return valB - valA; // highest first
    });

    SideBar.reappend(children);
};

// White flag sort
SideBar.whiteFlagSort = function () {
    let children = SideBar.getChildrenArray();

    children.sort((a, b) => {
        let valA = parseInt(a.querySelector(".previewWflagCount").innerHTML) || 0;
        let valB = parseInt(b.querySelector(".previewWflagCount").innerHTML) || 0;
        return valB - valA;
    });

    SideBar.reappend(children);
};

// Toggle sort order (ascending/descending)
SideBar.sortOrder = function () {
    let children = SideBar.getChildrenArray();
    children.reverse();
    SideBar.reappend(children);
};

const redFilter = document.getElementById("redFilter");
const whiteFilter = document.getElementById("whiteFilter");

redFilter.addEventListener("click", (e) =>{
    redWheelDisable = false;
    var color = "black";
    if(redFilter.classList.contains("red")){
        redFilter.classList.remove("red");
        redFilter.classList.add("orange");
        color = "medium";
    }else if(redFilter.classList.contains("orange")){
    redFilter.classList.remove("orange");
        redFilter.classList.add("yellow");
        color = "low";
    }else if(redFilter.classList.contains("yellow")){
        redFilter.classList.remove("yellow");
        redFilter.classList.add("black");
        color = "black";
    }else if(redFilter.classList.contains("black")){
        redFilter.classList.remove("black");
        redFilter.classList.add("red");
        color = "high";
    }
    filterFlags(redFlagsBody, color, APICalls.fileFlagStorageList); 
});



whiteFilter.addEventListener("click", (e) =>{
    var color = "black";
    whiteWheelDisable = false;
    if(whiteFilter.classList.contains("red")){
        whiteFilter.classList.remove("red");
        whiteFilter.classList.add("orange");
        color = "medium";
    }else if(whiteFilter.classList.contains("orange")){
    whiteFilter.classList.remove("orange");
        whiteFilter.classList.add("yellow");
        color = "low";
    }else if(whiteFilter.classList.contains("yellow")){
        whiteFilter.classList.remove("yellow");
        whiteFilter.classList.add("black");
        color = "black";
    }else if(whiteFilter.classList.contains("black")){
        whiteFilter.classList.remove("black");
        whiteFilter.classList.add("red");
        color = "high";
    }
    filterFlags(whiteFlagsBody, color, APICalls.fileWhiteFlagStorageList);
});

function filterFlags(container, type, list){
    container.innerHTML = "";
    const index = APICalls.currentFile;

    const flags = list[index];

    for (let i = 0; i < flags.length; i++) {
        const currentFlag = flags[i];
        if (currentFlag.severity === type || type === "black") {
            container.addFlag(currentFlag);
        }   
    }
    container.scroller = createScroller(container);
}