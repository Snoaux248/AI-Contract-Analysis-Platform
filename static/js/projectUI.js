  
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
                await APICalls.fetchRedFlags(contractID);

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
        wFlagCount.innerHTML = 0;
        console.log("wFlagCount: " + wFlagCount.innerHTML);
        wFlagCount.classList.add("previewWflagCount");

        div.appendChild(rFlagCount);
        div.appendChild(wFlagCount);

        const index = SideBar.childElementCount;

        div.appendChild(flag);
        flag.addEventListener("click", (e) =>{
            SideBar.close();
            previewBtn.children[0].innerHTML = "clear";
            FullScreenViewer.classList.remove("closed");
            FullScreenViewerTitle.innerHTML = name;
            FullScreenViewerPDF.setPDF(file);
            console.log("indes: " + index);
            console.log("Flags: " + APICalls.fileFlagStorageList[index]);
            redFlagsBody.innerHTML = "";
            for(var i = 0; i < APICalls.fileFlagStorageList[index].length; i++){
                console.log(APICalls.fileFlagStorageList[index][i]);
                const currentFlag = { ...APICalls.fileFlagStorageList[index][i] };

                // format excerpt safely while keeping object intact
                const formattedExcerpt = (currentFlag.excerpt || "")
                    .replace(/^### (.*$)/gim, "<h4 style=\"margin:3px;\">$1</h4>")
                    .replace(/^---\s*$/gim, "<hr>");

                const html = `
                    <span >${currentFlag.title}</span>
                    <br>
                    <span >
                        Severity: <span style="color: ${APICalls.severities[currentFlag.severity] || 'black'};">
                            ${currentFlag.severity}
                        </span>
                    </span>
                    <br>
                    <span >${currentFlag.explanation}</span>
                    <br>
                    <span >${formattedExcerpt}</span>
                `;
                console.log(html);
                redFlagsBody.addFlag(html);
            }
            const contractStats = APICalls.contractStats[index];
            console.log(contractStats);
            FullScreenViewerTitle.innerHTML += "<br>Chunk Count: " + contractStats.chunk_count + "<br>"+
                                                "Embedding Dimensions: " + contractStats.embedding_dim +"<br>"+
                                                "Text Length: "+ contractStats.text_length;
            redFlags.scroller = createScroller("redFlagsBody");
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
        this.innerHTML = "";
        APICalls.fileList.forEach((file, index) => {
            this.addFile(file.name, file, index);
        });
        if(APICalls.fileList.length % 2 == 1){
            SideBar.addFakeFile();
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
const redFlags = document.getElementById("redFlags");
const whiteFlags = document.getElementById("whiteFlags");

const redFlagsBody = document.getElementById("redFlagsBody");
const whiteFlagsBody = document.getElementById("whiteFlagsBody");
const redFlagsTitle = document.getElementById("redFlagsTitle");
const whiteFlagsTitle = document.getElementById("whiteFlagsTitle");

FullScreenViewerPDF.setPDF = function (file) {
    const pdfjsLib = window["pdfjs-dist/build/pdf"];

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    // Cache last loaded file name on the instance
    if (this._lastFileName === file.name) {
        return; // same file → do nothing
    }
    this._lastFileName = file.name;

    this.innerHTML = "";
    const container = document.createElement("div");
    container.className = "pdf-scroll-container";
    this.appendChild(container);

    const fileURL = URL.createObjectURL(file);

    pdfjsLib.getDocument(fileURL).promise.then(async (pdf) => {
        const scale = 1.2;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            canvas.className = "pdf-page";

            const context = canvas.getContext("2d");

            const containerWidth = container.clientWidth;
            const scaleRatio = containerWidth / viewport.width;

            const scaledViewport = page.getViewport({
                scale: scale * scaleRatio
            });

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;

            container.appendChild(canvas);
        }
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


function addFlagToBody(flag, parent){
    const div = document.createElement("div");
    div.innerHTML = flag;
    const expand = document.createElement("span");
    expand.innerHTML = "keyboard_arrow_down";
    expand.classList.add("expansionIcon");
    div.appendChild(expand);
    parent.appendChild(div);

    expand.addEventListener("click", (e) =>{
        e.preventDefault();
        if(expand.innerHTML === "keyboard_arrow_down" && expand.parentNode.classList.contains("active")){
            expand.innerHTML = "keyboard_arrow_up";
            console.log("RFB HIEGHT: " + redFlagsBody.style.offsetHeight);
            expand.parentNode.style.maxHeight = "calc(100% - 30px)";
            expand.parentNode.style.minHeight = "calc(100% - 30px)";
            expand.parentNode.style.height = "calc(100% - 30px)";
            redWheelDisable = true;
            var index = [...expand.parentNode.parentNode.children].indexOf(expand.parentNode);
            setTimeout(() => {
                redFlags.scroller.scrollToItem(index);
            }, 300);
        }else{
            expand.innerHTML = "keyboard_arrow_down";
            expand.parentNode.style.maxHeight = "calc(100px)";
            expand.parentNode.style.minHeight = "calc(100px)";
            expand.parentNode.style.height = "calc(100px)";
            redWheelDisable = false;
        }
        
    });

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
    const container = document.getElementById(containerId);
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
redFlags.scroller = createScroller("redFlagsBody");
whiteFlags.scroller = createScroller("whiteFlagsBody");