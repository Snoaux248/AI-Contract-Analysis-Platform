document.addEventListener("DOMContentLoaded", () => {

    console.log("JS READY");

    // ================= STATE =================
    let activeContractId = "";
    let currentFile = 0;
    let currentUploaded = 0;
    const fileList = [];

    // ================= ELEMENTS =================
    const fileUpload = document.querySelector(".fileUpload");
    const Files = document.getElementById("Files");
    const Output = document.getElementById("Output");
    const TextFeild = document.getElementById("TextFeild");
    const uploadBtn = document.getElementById("FileUploadButton");
    const fileBtn = document.getElementById("FileButton");
    const Drop = document.getElementById("Drop");
    const SideBar = document.getElementById("SideBar");
    const Preview = document.getElementById("Preview");
    const previewBtn = document.getElementById("PreviewButton");

    // ================= SAFETY CHECK =================
    if(!uploadBtn || !fileUpload){
        console.error("CRITICAL ELEMENTS MISSING");
        return;
    }

    // ================= FILE SELECT =================
    window.chooseFiles = function (){
        fileUpload.click();
    };

    fileUpload.addEventListener("change", () => {
        for(let i = 0; i < fileUpload.files.length; i++){
            if(fileUpload.files[i].type == "application/pdf"){
            fileList.push(fileUpload.files[i]);
            }
        }
        currentFile = fileList.length;
        refreshFileListUI();
    });

    function refreshFileListUI(){
        Files.innerHTML = "";

        fileList.forEach((file, index) => {
            const div = document.createElement("div");

            const text = document.createElement("p");
            text.innerText = file.name;

            const button = document.createElement("button");
            button.textContent = "clear";
            button.className = "RemoveFileButton material-symbols-outlined";

            if(index < currentUploaded){
                button.disabled = true;
            }

            button.onclick = () => {
                fileList.splice(index, 1);
                currentFile = fileList.length;
                refreshFileListUI();
            };

            div.appendChild(text);
            div.appendChild(button);
            Files.appendChild(div);
        });
    }

    // ================= UPLOAD =================
    uploadBtn.type = "button"; // 🔥 fix submit bug

    uploadBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log("UPLOAD CLICKED");

        if(currentFile === 0){
            display_model_response(" Please upload a contract first.");
            return;
        }

        const file = fileList[0];
        const formData = new FormData();
        formData.append("file", file);

        try{
            Drop.close();
            display_model_response(`Processing contract... ${fileList[0].name}`);

            const response = await fetch("/Capstone/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("UPLOAD RESPONSE:", data);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Upload failed");
            }

            activeContractId = data.contract_id;
            currentUploaded = currentFile;

            display_model_response(`Contract processed: ${data.filename}`);

            updateSidebarUI();

            await fetchRedFlags();

            if(TextFeild.value.trim().length > 0){
                await promptModelWithText();
            }
        }catch(err){
            Drop.open();
            console.error(err);
            display_model_response(" Upload failed: " + err.message);
        }
    });

    // ================= RED FLAGS =================
    async function fetchRedFlags(){
        if(!activeContractId){
            return;
        }

        try{
            display_model_response("Analyzing red flags...");

            const response = await fetch("/Capstone/api/redflags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contract_id: activeContractId })
            });

            const data = await response.json();
            console.log("REDFLAGS:", data);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Red flag analysis failed");
            }

            if(!data.red_flags.length){
                display_model_response(" No red flags detected.");
                return;
            }
            let color = "red";
            data.red_flags.forEach(flag => {
                flag.excerpt = flag.excerpt.replace(/^### (.*$)/gim, "<h4 style=\"margin:3px;\">$1</h4>").replace(/^--- $/gim, "<hr>");
                display_model_response(`
                    <div style="margin-left: 16px;">${flag.title}</div>
                    <div style="margin-left: 16px;">
                      Severity: <span style="color: ${Severities[flag.severity]};">${flag.severity}</span>
                    </div>
                    <div style="margin-left: 16px;">${flag.explanation}</div>
                    <div style="margin-left: 16px;">"${flag.excerpt}"</div>
                `);
            });

        }catch(err){
            console.error(err);
            display_model_response(" Red flag error: " + err.message);
        }
    }
    const Severities = {
        high: 'red',
        medium: 'orange',
        low: 'yellow',
        none: 'green'
    };

    // ================= ASK =================
    async function promptModelWithText(){
        const question = TextFeild.value.trim();
        if(question.length === 0 || !activeContractId){
            return;
        }
        appendUserMessage(question);
        TextFeild.value = "";

        try{
            const response = await fetch("/Capstone/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contract_id: activeContractId,
                    question: question
                })
            });

            const data = await response.json();
            console.log("ASK RESPONSE:", data);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Question failed");
            }

            display_model_response(data.answer.replace(/\[chunk_(\d+)\]/g, '\n<br><br><br>$1').replace(/LLM API key not configured\. Showing best retrieved excerpts instead\./g, ''));

        }catch(err){
            console.error(err);
            display_model_response("Ask error: " + err.message);
        }
    }

    // ================= ENTER =================
    TextFeild.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey){
            e.preventDefault();

            if(currentUploaded === 0){
                uploadBtn.click();
            }else{
                promptModelWithText();
            }
        }
    });

    // ================= CHAT UI =================
    function appendUserMessage(text){
        const div = document.createElement("div");
        div.className = "userdiv";

        const p = document.createElement("p");
        p.className = "usertext";
        p.innerText = text;

        div.appendChild(p);
        Output.appendChild(div);
        Output.scrollTop = Output.scrollHeight;
    }

    function display_model_response(text){
        console.log("MODEL:", text);

        const div = document.createElement("div");
        div.className = "modeldiv";

        const p = document.createElement("p");
        p.className = "modeltext";
        p.innerHTML = text;

        div.appendChild(p);
        Output.appendChild(div);

        Output.scrollTop = Output.scrollHeight;
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

    function updateSidebarUI(){
        SideBar.innerHTML = "";
        fileList.forEach(file => {
            SideBar.addFile(file.name, file);
        });
        SideBar.open();
    }

    // toggle sidebar
    previewBtn.addEventListener("click", () => {
        if(SideBar.isOpened()){
            SideBar.close();
        }else{
            SideBar.open();
        }
    });

    // ================= DRAG DROP =================
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

    Drop.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;
        fileUpload.files = files;

        for(let i = 0; i < files.length; i++){
            fileList.push(files[i]);
        }

        currentFile = fileList.length;
        refreshFileListUI();
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
    
    fileBtn.addEventListener("click", (e) => {
        console.log("click");
        Drop.toggleView();
    });

});