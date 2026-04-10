document.addEventListener("DOMContentLoaded", () => {

    console.log("JS READY");

    // ================= STATE =================
    var APICalls = new API();

    // ================= ELEMENTS =================
    const fileUpload = document.querySelector(".fileUpload");
    const Files = document.getElementById("Files");
    const Output = document.getElementById("Output");
    const TextFeild = document.getElementById("TextFeild");
    const Drop = document.getElementById("Drop");
    const SideBar = document.getElementById("SideBar");

    const uploadBtn = document.getElementById("FileUploadButton");
    const fileBtn = document.getElementById("FileButton");
    const previewBtn = document.getElementById("PreviewButton");

    // ================= SAFETY CHECK =================
    if(!uploadBtn || !fileUpload){
        console.error("CRITICAL ELEMENTS MISSING");
        return;
    }

    // ================= FILE SELECT =================
    window.chooseFiles = function(){
        fileUpload.click();
    };

    fileUpload.addEventListener("change", () => {
        for(let i = 0; i < fileUpload.files.length; i++){
            if(fileUpload.files[i].type == "application/pdf"){
            APICalls.fileList.push(fileUpload.files[i]);
            }
        }
        APICalls.currentFile = APICalls.fileList.length;
        Drop.refreshFileList();
    });
    // ================= UPLOAD =================
    uploadBtn.type = "button"; // 🔥 fix submit bug

    uploadBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log("UPLOAD CLICKED");

        if(APICalls.currentFile === 0){
            Output.appendModelResponse(" Please upload a contract first.");
            return;
        }

        const file = APICalls.fileList[0];
        const formData = new FormData();
        formData.append("file", file);

        try{
            Drop.close();
            Output.appendModelResponse(`Processing contract... ${APICalls.fileList[0].name}`);

            const response = await fetch("/Capstone/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("UPLOAD RESPONSE:", data);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Upload failed");
            }

            APICalls.activeContractId = data.contract_id;
            APICalls.currentUploaded = APICalls.currentFile;

            Output.appendModelResponse(`Contract processed: ${data.filename}`);

            SideBar.updateUI();

            await APICalls.fetchRedFlags();

            if(TextFeild.value.trim().length > 0){
                await APICalls.promptModelWithText();
            }
        }catch(err){
            Drop.open();
            console.error(err);
            Output.appendModelResponse(" Upload failed: " + err.message);
        }
    });
    

    // ================= Button EL =================
    previewBtn.addEventListener("click", () => {
        if(SideBar.isOpened()){
            SideBar.close();
        }else{
            SideBar.open();
        }
    });

    TextFeild.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey){
            e.preventDefault();

            if(APICalls.currentUploaded === 0){
                uploadBtn.click();
            }else{
                APICalls.promptModelWithText();
            }
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
    };

    SideBar.close = function(){
        SideBar.classList.remove("opened");
        SideBar.classList.add("closed");
    };
    SideBar.isOpened = function(){
        return SideBar.classList.contains("opened") ? true : false ;
    };

    SideBar.isClosed = function(){
        return SideBar.classList.contains("closed") ? true : false ;
    };

    SideBar.addFile = function(name, file){
        const div = document.createElement("div");
        div.className = "filePreview";

        const embed = document.createElement("embed");
        embed.src = URL.createObjectURL(file);
        embed.className = "EmbeddedPDF";

        const p = document.createElement("p");
        p.innerText = name;

        div.appendChild(embed);
        div.appendChild(p);
        SideBar.appendChild(div);
    };
    SideBar.updateUI = function(){
        this.innerHTML = "";
        APICalls.fileList.forEach(file => {
            this.addFile(file.name, file);
        });
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
    }
    Drop.open = function(){
        Drop.classList.remove("closed");
        Drop.classList.add("opened");
    }

    Drop.refreshFileList = function(){
        Files.innerHTML = "";

        APICalls.fileList.forEach((file, index) => {
            const div = document.createElement("div");

            const text = document.createElement("p");
            text.innerText = file.name;

            const button = document.createElement("button");
            button.textContent = "clear";
            button.className = "RemoveFileButton material-symbols-outlined";

            if(index < APICalls.currentUploaded){
                button.disabled = true;
            }

            button.onclick = () => {
                APICalls.fileList.splice(index, 1);
                APICalls.currentFile = APICalls.fileList.length;
                Drop.refreshFileList();
            };

            div.appendChild(text);
            div.appendChild(button);
            Files.appendChild(div);
        });
    }

});

class API{

    constructor(){
        this.activeContractId = "";
        this.currentFile = 0;
        this.currentUploaded = 0;
        this.fileList = [];
        this.severities = {
            high: 'red',
            medium: 'orange',
            low: 'yellow',
            none: 'green'
        };
    }
    // ================= RED FLAGS =================
    async fetchRedFlags(){
        if(!this.activeContractId){
            return;
        }

        try{
            Output.appendModelResponse("Analyzing red flags...");

            const response = await fetch("/Capstone/api/redflags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contract_id: this.activeContractId })
            });

            const data = await response.json();
            console.log("REDFLAGS:", data);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Red flag analysis failed");
            }

            if(!data.red_flags.length){
                Output.appendModelResponse(" No red flags detected.");
                return;
            }
            data.red_flags.forEach(flag => {
                flag.excerpt = flag.excerpt.replace(/^### (.*$)/gim, "<h4 style=\"margin:3px;\">$1</h4>").replace(/^--- $/gim, "<hr>");
                console.log(`<div style="margin-left: 16px;">${flag.title}</div>
                    <div style="margin-left: 16px;">
                      Severity: <span style="color: ${this.severities[flag.severity]};">${flag.severity}</span>
                    </div>
                    <div style="margin-left: 16px;">${flag.explanation}</div>
                    <div style="margin-left: 16px;">"${flag.excerpt}"</div>`);
                Output.appendModelResponse(`
                    <div style="margin-left: 16px;">${flag.title}</div>
                    <div style="margin-left: 16px;">
                      Severity: <span style="color: ${this.severities[flag.severity]};">${flag.severity}</span>
                    </div>
                    <div style="margin-left: 16px;">${flag.explanation}</div>
                    <div style="margin-left: 16px;">"${flag.excerpt}"</div>
                `);
            });

        }catch(err){
            console.error(err);
            Output.appendModelResponse(" Red flag error: " + err.message);
        }
    }

    // ================= ASK =================
    async promptModelWithText(){
        const question = TextFeild.value.trim();
        if(question.length === 0 || !this.activeContractId){
            return;
        }
        Output.appendUserMessage(question);
        TextFeild.value = "";

        try{
            const response = await fetch("/Capstone/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contract_id: this.activeContractId,
                    question: question
                })
            });

            const data = await response.json();
            console.log("ASK RESPONSE:", data);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Question failed");
            }

            Output.appendModelResponse(data.answer.replace(/\[chunk_(\d+)\]/g, '\n<br><br><br>$1').replace(/LLM API key not configured\. Showing best retrieved excerpts instead\./g, ''));

        }catch(err){
            console.error(err);
            Output.appendModelResponse("Ask error: " + err.message);
        }
    }
}