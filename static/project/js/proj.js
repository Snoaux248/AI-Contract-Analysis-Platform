var currentFile = 0;
var currentUploaded = 0;
const fileList = [];


const fileUpload = document.getElementsByClassName("fileUpload")[0];
function chooseFiles(){
    fileUpload.click();
};
fileUpload.addEventListener('change', (event) => {
    fileUploadChange();
});
function fileUploadChange(){
    for(var i = 0; i < fileUpload.files.length; i++){
        if (fileUpload.files[i].type == "application/pdf"){
            fileList.push(fileUpload.files[i]);
            currentFile++;
        }
    }
    removeUploadedFile();
    for(var i = 0; i < currentFile; i++){
        console.log(fileList[i].name);
    }
    displayUploadedFiles();
}


function removeUploadedFile(){
    var Files = document.getElementById("Files");
    for(var i = Files.childElementCount - 1; i > -1; i--){
        Files.removeChild(Files.children[i]);
    }
}

function displayUploadedFiles(){
    for(var i = 0; i < currentFile; i++){
        var text = document.createElement("p");
        text.innerHTML = fileList[i].name;
        text.style.margin = "0px";

        var button = document.createElement("button");
        button.className = "material-symbols-outlined";
        button.textContent = "clear";
        button.classList.add("RemoveFileButton");

        var div = document.createElement("div");
        div.appendChild(text);
        div.appendChild(button);

        if(i < currentUploaded){
            button.disabled = true;
        }
        document.getElementById("Files").appendChild(div);
        button.addEventListener('click', (e) => {
            var index = Array.prototype.indexOf.call(Files.children, e.target.parentNode);
            Files.removeChild(e.target.parentNode);
            fileList.splice(index, 1);
            currentFile--;
        });
    }
}

const Preview = document.getElementById("Preview");
const SideBar = document.getElementById("SideBar");

SideBar.open = function(){
    SideBar.classList.remove("closed");
    SideBar.classList.add("opened");
}
SideBar.close = function(){
    SideBar.classList.remove("opened");
    SideBar.classList.add("closed");
}
SideBar.addFile = function(name, file){
    var p = document.createElement("p");
    p.innerHTML = name;
    p.zIndex = 10;

    var embed = document.createElement("embed");
    embed.src = URL.createObjectURL(file);
    embed.classList.add("EmbeddedPDF");

    var div = document.createElement("div");
    div.classList.add("filePreview");
    div.appendChild(embed);
    div.appendChild(p);

    SideBar.appendChild(div);
}
SideBar.addTempFile = function(){
    var div = document.createElement("div");
    div.style.opacity = 0;
    div.classList.add("filePreview");
    SideBar.appendChild(div);
}
SideBar.isClosed = function(){
    return SideBar.classList.contains("closed") ? true : false;
}
SideBar.isOpened = function(){
    return SideBar.classList.contains("opened") ? true : false;
}

Preview.addEventListener("click", (e) => {
    e.preventDefault();
    if(SideBar.isOpened()){
        SideBar.close();
    }else{
        SideBar.open();
    }
});

const Drop = document.getElementById("Drop");
const FileButton = document.getElementById("FileButton");
const FileUploadButton = document.getElementById("FileUploadButton");



['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  Drop.addEventListener(eventName, preventDefaults, false);
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

Drop.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();

}

function handleDrop(e){
    e.preventDefault();
    const data = e.dataTransfer;
    const files = data.files;
    fileUpload.files = files;

    fileUploadChange()
}

FileButton.addEventListener("click", (e) =>{
    e.preventDefault();
    Drop.style.transition = ".1s";
    if(Drop.classList.contains("closed")){
        Drop.classList.remove("closed");
    }else{
        Drop.classList.add("closed");
    }
     setTimeout(() => {
        Drop.style.transition = ".7s";
    }, 100);
});

FileUploadButton.addEventListener("click", (e) =>{
    e.preventDefault();
    FileUploadFunction();
    if(currentUploaded != 0){
        promptModelWithText();
    }
});

function FileUploadFunction(){
    if(currentFile == 0){
        console.log("Error must upload file");
        return;
    }
    
    currentUploaded = currentFile;

    if(SideBar.children.length % 2 == 0 && SideBar.children.length != 0){
        SideBar.removeChild(SideBar.lastElementChild);
    }

    if((currentFile > SideBar.children.length)){
        //removes temp file preview if present
        for(var i = SideBar.children.length; i < currentFile; i++){
            SideBar.addFile(fileList[i].name, fileList[i]);
        }
        SideBar.open();
    }
    //adds temp file preview if necessary
    if(currentFile % 2 == 1){
        SideBar.addTempFile();
    }
    //UI views
    Drop.style.transition = ".2s";
    for(var i = 0; i < currentFile; i++){
        Files.children[i].children[1].disabled = true;
    }
    if(!Drop.classList.contains("closed")){
        Drop.classList.add("closed");
    }
    setTimeout(() => {
        Drop.style.transition = ".1s";
    }, 100);
}

var TextFeild = document.getElementById("TextFeild");
TextFeild.addEventListener("keydown", (e) =>{
    if(e.key === 'Enter' && e.shiftKey){
        e.preventDefault();
        if(currentFile > 0 && currentUploaded == 0){
            FileUploadFunction();
            promptModelWithText();
        }else if(currentFile > 0){
            promptModelWithText();
        }
    }
});

var Output = document.getElementById("Output");

function promptModelWithText(){
    console.log(TextFeild.value.trim().length, TextFeild.value.trim(), TextFeild.value);
    if(TextFeild.value.trim().length == 0){
        return;
    }
    var p = document.createElement("p");
    p.classList.add("usertext");
    p.innerHTML = TextFeild.value.trim();
    TextFeild.value = "";

    var userdiv = document.createElement("div");
    userdiv.classList.add("userdiv");
    userdiv.appendChild(p);

    Output.appendChild(userdiv);
}   