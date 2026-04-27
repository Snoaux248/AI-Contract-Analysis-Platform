class API{

    constructor(){
        this.activeContractId = 0;
        this.contractIds = [];
        this.contractStats = [];
        this.fileList = [];
        this.fileUploaded = [];

        this.filePreviewList = [];
        this.fileFlagStorageList = [];

        this.severities = {
            high: 'red',
            medium: 'orange',
            low: 'yellow',
            none: 'green'
        };
    }


    async uploadFiles(fileIndex){
        Output.appendUserMessage("Uploading File: " + APICalls.fileList[fileIndex].name);
        try{
            Drop.close();
            //Output.appendModelResponse(`Processing contract... ${APICalls.fileList[fileIndex].name}`);
            
            const file = APICalls.fileList[fileIndex];
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/Capstone/api/upload", {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            console.log("UPLOAD RESPONSE:", data);
            this.contractStats.push(data.stats);
        
            if(!response.ok || !data.success){
                throw new Error(data.error || "Upload failed");
            }
        
            this.contractIds[fileIndex] = data.contract_id;
            this.activeContractId = data.contract_id;
        
            Output.appendModelResponse(`Contract processed: ${data.filename}`);

            return this.contractIds[fileIndex];
        }catch(err){
            Drop.open();
            console.error(err);
            Output.appendModelResponse(" Upload failed: " + err.message);
        }

    }


    // ================= RED FLAGS =================
    async displayRedFlags(data) {

    try {
        for (let i = 0; i < data.red_flags.length; i++) {
            const currentFlag = { ...data.red_flags[i] };

            // format excerpt safely while keeping object intact
            const formattedExcerpt = (currentFlag.excerpt || "")
                .replace(/^### (.*$)/gim, "<h4 style=\"margin:3px;\">$1</h4>")
                .replace(/^---\s*$/gim, "<hr>");

            const html = `
                <div style="margin-left: 16px;">${currentFlag.title}</div>
                <div style="margin-left: 16px;">
                    Severity: <span style="color: ${this.severities[currentFlag.severity] || 'black'};">
                        ${currentFlag.severity}
                    </span>
                </div>
                <div style="margin-left: 16px;">${currentFlag.explanation}</div>
                <div style="margin-left: 16px;">${formattedExcerpt}</div>
            `;
            console.log(html);
            Output.appendModelResponse(html);
        }
    } catch (err) {
        console.error(err);
        Output.appendModelResponse(" Red flag error: " + err.message);
    }
        /*
        try{
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
        }*/
    }

    async fetchRedFlags(contractId){
        console.log("ContractId " + contractId);
            Output.appendModelResponse("Analyzing red flags...");

            const response = await fetch("/Capstone/api/redflags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contract_id: contractId })
            });

            const data = await response.json();
            this.fileFlagStorageList.push(data.red_flags);
            console.log(this.fileFlagStorageList);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Red flag analysis failed");
            }

            if(!data.red_flags.length){
                Output.appendModelResponse(" No red flags detected.");
                return;
            }
            //APICalls.displayRedFlags(data);
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