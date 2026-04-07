let activeContractId = "";

const statusMessage = document.getElementById("statusMessage");
const metadataPanel = document.getElementById("metadataPanel");
const answerPanel = document.getElementById("answerPanel");
const answerText = document.getElementById("answerText");
const chunksList = document.getElementById("chunksList");
const redflagPanel = document.getElementById("redflagPanel");

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b91c1c" : "#1f2937";
}

document.getElementById("uploadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fileInput = document.getElementById("contractFile");
  if (!fileInput.files.length) {
    setStatus("Please choose a contract file.", true);
    return;
  }

  setStatus("Processing contract...");
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const response = await fetch("/Capstone/api/upload", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Upload failed");
    }

    activeContractId = data.contract_id;
    setStatus(`Processed: ${data.filename} (ID: ${activeContractId})`);
    metadataPanel.classList.remove("hidden");
    metadataPanel.innerHTML = `
      <h3>Contract Metadata</h3>
      <p><strong>Chunk count:</strong> ${data.stats.chunk_count}</p>
      <p><strong>Text length:</strong> ${data.stats.text_length}</p>
      <p><strong>Embedding dim:</strong> ${data.stats.embedding_dim}</p>
    `;
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("askBtn").addEventListener("click", async () => {
  if (!activeContractId) {
    setStatus("Process a contract before asking questions.", true);
    return;
  }

  const question = document.getElementById("questionInput").value.trim();
  if (!question) {
    setStatus("Enter a question first.", true);
    return;
  }

  setStatus("Retrieving answer...");
  try {
    const response = await fetch("/Capstone/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_id: activeContractId, question }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Question failed");
    }

    answerPanel.classList.remove("hidden");
    answerText.textContent = data.answer;
    chunksList.innerHTML = "";
    data.retrieved_chunks.forEach((chunk) => {
      const item = document.createElement("div");
      item.className = "chunk";
      item.innerHTML = `
        <strong>${chunk.title || chunk.chunk_id}</strong>
        <p>Section: ${chunk.section_ref || "N/A"} | Score: ${chunk.score.toFixed(3)}</p>
        <p>${chunk.text.slice(0, 360)}...</p>
      `;
      chunksList.appendChild(item);
    });
    setStatus(`Answer generated (${data.mode}).`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("redflagsBtn").addEventListener("click", async () => {
  if (!activeContractId) {
    setStatus("Process a contract before red-flag analysis.", true);
    return;
  }

  setStatus("Analyzing red flags...");
  try {
    const response = await fetch("/Capstone/api/redflags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_id: activeContractId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Red flag analysis failed");
    }

    redflagPanel.classList.remove("hidden");
    if (!data.red_flags.length) {
      redflagPanel.innerHTML = "<p>No red flags detected by current rules.</p>";
      setStatus("Red flag analysis complete.");
      return;
    }

    redflagPanel.innerHTML = data.red_flags
      .map((flag) => `
        <div class="chunk flag-${flag.severity}">
          <strong>${flag.title}</strong>
          <p>Severity: ${flag.severity} | Category: ${flag.category}</p>
          <p>${flag.explanation}</p>
          <p><em>${flag.excerpt}</em></p>
        </div>
      `)
      .join("");
    setStatus(`Red flag analysis complete: ${data.red_flags.length} findings.`);
  } catch (error) {
    setStatus(error.message, true);
  }
});
