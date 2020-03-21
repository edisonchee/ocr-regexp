const scheduler = Tesseract.createScheduler();

const worker = Tesseract.createWorker();

scheduler.addWorker(worker);

const setupTesseract = async () => {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
}

let REGEXP = null;

let DOM_EL = {
  app: null,
  fileInput: null,
  fileDialogueBtn: null,
  dropzone: null,
  status: null,
  matchedItems: null,
  imageGrid: null,
  csv: null
}

window.addEventListener('DOMContentLoaded', evt => {
  DOM_EL.app = document.getElementById('app');
  DOM_EL.fileInput = document.getElementById('file-input');
  DOM_EL.fileDialogueBtn = document.getElementById('file-dialogue-btn');
  DOM_EL.dropzone = document.getElementById('dropzone');
  DOM_EL.status = document.getElementById('status');
  DOM_EL.matchedItems = document.getElementById('matched-items');
  DOM_EL.imageGrid = document.getElementById('image-grid');
  DOM_EL.csv = document.getElementById('csv');
  DOM_EL.csv.value = "";
  
  DOM_EL.dropzone.addEventListener('dragenter', highlight);
  DOM_EL.dropzone.addEventListener('dragover', highlight);

  DOM_EL.dropzone.addEventListener('dragleave', unhighlight);
  DOM_EL.dropzone.addEventListener('drop', unhighlight);
  DOM_EL.fileDialogueBtn.addEventListener('click', openFileDialogue);

  DOM_EL.dropzone.addEventListener('drop', handleDrop);
  DOM_EL.fileInput.addEventListener('change', handleClick);

  DOM_EL.csv.addEventListener('blur', getKeywords);

  setupTesseract();
})

const highlight = evt => {
  preventDefaults(evt);
  DOM_EL.dropzone.classList.add('active');
}

const unhighlight = evt => {
  preventDefaults(evt);
  DOM_EL.dropzone.classList.remove('active');
}

const handleDrop = async (evt) => {
  DOM_EL.matchedItems.innerHTML = "";

  let dt = evt.dataTransfer;
  let files = dt.files;
  
  let done = await handleFiles(files);

  if (done && scheduler.getQueueLen() === 0) {
    DOM_EL.app.classList.remove('processing');
    DOM_EL.csv.disabled = false;
  } else {
    DOM_EL.app.classList.add('error');
    setTimeout(() => {
      DOM_EL.app.classList.remove('error');
    }, 3000);
    DOM_EL.app.classList.remove('processing');
    DOM_EL.csv.disabled = false;
  }
}

const handleClick = async (evt) => {
  DOM_EL.matchedItems.innerHTML = "";

  let done = await handleFiles(evt.target.files);

  if (done && scheduler.getQueueLen() === 0) {
    DOM_EL.app.classList.remove('processing');
    DOM_EL.csv.disabled = false;
  } else {
    DOM_EL.app.classList.add('error');
    setTimeout(() => {
      DOM_EL.app.classList.remove('error');
    }, 3000);
    DOM_EL.app.classList.remove('processing');
    DOM_EL.csv.disabled = false;
  }
}

const handleFiles = async (files) => {
  let imgElArr = null;
  DOM_EL.app.classList.add('processing');
  DOM_EL.csv.disabled = true;
  
  try {
    imgElArr = await Promise.all(Array.from(files).map(file => preview(file)));
    await Promise.all(imgElArr.map(img => process(img)));

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

const preventDefaults = evt => {
  evt.preventDefault();
  evt.stopPropagation();
}

const preview = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
  
    reader.addEventListener('load', evt => {
      let imgContainer = document.createElement("li");
      let img = document.createElement("img");
      imgContainer.classList.add("image-container");
      imgContainer.appendChild(img);
      DOM_EL.imageGrid.appendChild(imgContainer);
      img.src = reader.result;
      resolve(img);
    })

    reader.addEventListener('error', evt => {
      reader.abort();
      reject();
    })

    if (file.type === "image/jpeg" || file.type === "image/png") {
      reader.readAsDataURL(file);
    } else {
      throw new Error(`Error reading files of type: ${file.type}`);
    }
  })
}

const process = async (img) => {
  try {
    const { data: { text } } = await scheduler.addJob('recognize', img);
    const found = text.match(REGEXP);

    if (found) {
      for (let i = 0; i < found.length; i++) {
        let listItem = document.createElement("li");
        let span = document.createElement("span");
        listItem.appendChild(span);
        span.innerText = found[i];
        DOM_EL.matchedItems.appendChild(listItem);
      }
    }

    return true;
  } catch (err) {
    console.log(err);
  }
}

const openFileDialogue = evt => {
  DOM_EL.fileInput.click();
}

const sanitiseHTML = string => {
	let temp = document.createElement('div');
  temp.textContent = string;
  
	return temp.innerHTML;
};

const getKeywords = () => {
  let sanitised = sanitiseHTML(DOM_EL.csv.value);
  let arr = sanitised.split(',');
  arr = arr.map(token => token.trim());
  arr = arr.join('|');

  REGEXP = new RegExp(`\\b(?:${arr})\\b`, 'g');
}