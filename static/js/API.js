function redFlagDedupeKey(f) {
    function norm(s) {
        return String(s || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }
    return [norm(f.title), norm(f.category), norm(f.excerpt), norm(f.match_text), norm(f.highlight_text)].join("||");
}

function citationQuoteLen(f) {
    return ((f.citation_quote || "") + "").trim().length;
}

function preferRedFlagForDedupe(f, cur) {
    var ln = citationQuoteLen(f);
    var lc = citationQuoteLen(cur);
    if (ln && lc && ln !== lc) return ln < lc;
    if (ln && !lc) return true;
    if (lc && !ln) return false;
    var a = f.chunk_id || "";
    var b = cur.chunk_id || "";
    if (a && b && a < b) return true;
    if (a && !b) return true;
    return false;
}

function dedupeRedFlags(list) {
    if (!Array.isArray(list)) return [];
    var best = {};
    for (var i = 0; i < list.length; i++) {
        var f = list[i];
        var k = redFlagDedupeKey(f);
        if (!best[k]) {
            best[k] = f;
            continue;
        }
        if (preferRedFlagForDedupe(f, best[k])) best[k] = f;
    }
    return Object.keys(best).map(function (key) {
        return best[key];
    });
}

function dedupeWhiteFlags(list) {
    if (!Array.isArray(list)) return [];
    var byId = {};
    for (var i = 0; i < list.length; i++) {
        var f = list[i] || {};
        var id = String(f.id || "").trim();
        if (!id) continue;
        if (!byId[id]) {
            byId[id] = f;
            continue;
        }
        var cur = byId[id];
        var a = (f.best_match || "").trim().length;
        var b = (cur.best_match || "").trim().length;
        if (a > b) byId[id] = f;
    }
    return Object.keys(byId).map(function (k) {
        return byId[k];
    });
}

class API{

    constructor(){
        this.activeContractId = 0;
        this.contractIds = [];
        this.contractStats = [];
        this.fileList = [];
        this.fileUploaded = [];

        this.filePreviewList = [];
        this.fileFlagStorageList = [];
        this.fileWhiteFlagStorageList = [];

        this.currentFile = 0;

        this.severities = {
            high: 'red',
            medium: 'orange',
            low: 'yellow',
            none: 'green'
        };
    }

    async sortFileFlagsBySeverity(index){
        const severityOrder = {
            high: 3,
            medium: 2,
            low: 1,
            none: 0
        };

        if (
            !this.fileFlagStorageList ||
            index < 0 ||
            index >= this.fileFlagStorageList.length
        ) {
            return;
        }

        const flags = this.fileFlagStorageList[index];

        flags.sort((a, b) => {
            return (severityOrder[b.severity?.toLowerCase()] || 0) -
                   (severityOrder[a.severity?.toLowerCase()] || 0);
        });
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

    async fetchRedFlags(contractId, index){
        console.log("ContractId " + contractId);

            const response = await fetch("/Capstone/api/redflags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contract_id: contractId })
            });

            const data = await response.json();
            const redFlags = dedupeRedFlags(data.red_flags || []);
            const whiteFlags = dedupeWhiteFlags(data.white_flags || []);
            this.fileFlagStorageList.push(redFlags);
            this.fileWhiteFlagStorageList.push(whiteFlags);
            await this.sortFileFlagsBySeverity(index);

            if(!response.ok || !data.success){
                throw new Error(data.error || "Red flag analysis failed");
            }

            Output.appendModelResponse(redFlags.length + " Red flags : White flags " + whiteFlags.length);

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