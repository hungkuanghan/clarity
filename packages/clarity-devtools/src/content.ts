import config from "./config";

let taskSettings;

chrome.runtime.sendMessage({ action: "init" }, function({ settings }) {
  taskSettings = settings;
  activate();
});

chrome.runtime.onMessage.addListener(function (message) {
  if (message.action === "activate") {
    activate();
  } else if (message.action === "warn") {
    console.warn(message.message);
  } else if (message.action == "switch-recording") {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://localhost:80/switch-recording", true);
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    xhr.send();
  }
  return true;
});

function getCurrentTaskNum() {
  if (!localStorage.getItem('currentTask')) {
    return null;
  }
  return parseInt(localStorage.getItem('currentTask'));
}

function loadTaskComponents() {
  const buttonMenu = document.createElement("div");
  buttonMenu.className = 'during-task-block';

  const helpButton = document.createElement("div");
  helpButton.className = 'task-help';
  helpButton.textContent = '?';
  helpButton.onclick = () => promptHelp(getCurrentTaskNum());

  const finishTaskButton = document.createElement("div");
  finishTaskButton.className = 'finish-task-button';
  finishTaskButton.textContent = 'Finish Task';
  finishTaskButton.onclick = () => {
    const confirmEnd = confirm('Are you sure you want to finish this task?');
    if (confirmEnd) {
      endTask(buttonMenu);
    }
  }

  buttonMenu.appendChild(helpButton);
  buttonMenu.appendChild(finishTaskButton);
  document.body.appendChild(buttonMenu);

  // fetch(chrome.runtime.getURL('/menu.html')).then(r => r.text()).then(html => {
    // document.body.insertAdjacentHTML('beforeend', html);
    
    // not using innerHTML as it would break js event listeners of the page
  // });
}

function removeLightbox() {
  const lb = document.getElementById('lightbox_background');
  lb.parentNode.removeChild(lb);
}

function endTask(buttonMenu) {
  sendTaskEndSignal();
  buttonMenu.parentNode.removeChild(buttonMenu);
  const nextTaskNum = getCurrentTaskNum() + 1;
  if (nextTaskNum <= taskSettings.length) {
    localStorage.setItem('currentTask', nextTaskNum.toString());
    promptTask(getCurrentTaskNum());
  }
}

function beginTask() {
  removeLightbox();
  sendTaskStartSignal();
  loadTaskComponents();
}

function newTaskBlock({ taskNum, taskTitle, scenario, taskDesc, button }) {
  const taskBlock = document.createElement("div");
  taskBlock.className = "task-block";
  const taskHeader = document.createElement("div");
  const headSpanOne = document.createElement("div");
  const headSpanTwo = document.createElement("div");
  headSpanOne.textContent = `Task ${taskNum} out of ${taskSettings.length}`;
  headSpanTwo.textContent = taskTitle;

  taskHeader.className = "task-block-header"
  taskHeader.appendChild(headSpanOne);
  taskHeader.appendChild(headSpanTwo);
  const p = document.createElement('p');
  p.innerHTML = `You are about begin task ${taskNum} of the usability study<br/><br/> \
  <u>Scenario</u>: ${scenario}<br/><br/> \
  <u>Task:</u> ${taskDesc}<br/><br/> \
  Please click on <b>Begin Task</b> to start the task, and click on <b>Finish Task</b> button to end the task.<br/><br/> \
  (If you want to view the task descriptions again during the test, click on <b>?</b> button.)`;
  const taskBlockCenter = document.createElement("div");
  taskBlockCenter.className = "task-block-center";
  taskBlockCenter.appendChild(p);
  const taskBlockFooter = document.createElement("div");
  taskBlockFooter.className = "task-block-footer";
  taskBlockFooter.appendChild(button);
  taskBlock.appendChild(taskHeader);
  taskBlock.appendChild(taskBlockCenter);
  taskBlock.appendChild(taskBlockFooter);
  return taskBlock;
}

function createLightbox() {
  const background = document.createElement('div');
  background.id = "lightbox_background";
  const lightbox = document.createElement('div');
  lightbox.id = "lightbox";
  
  document.body.appendChild(background);
  background.appendChild(lightbox);
  return background;
}

function promptHelp(taskNum) {
  const background = createLightbox();
  const taskSetting = taskSettings[taskNum - 1]
  const returnButton = document.createElement('span');
  returnButton.onclick = removeLightbox;
  returnButton.textContent='Return';

  const taskBlock = newTaskBlock({
    taskNum,
    button: returnButton,
    ...taskSetting,
  });
  
  background.appendChild(taskBlock);
}

function promptTask(taskNum) {
  const background = createLightbox();
  const taskSetting = taskSettings[taskNum - 1];
  
  const beginButton = document.createElement('span');
  beginButton.onclick = beginTask;
  beginButton.textContent='Begin Task';

  const taskBlock = newTaskBlock({
    taskNum,
    button: beginButton,
    ...taskSetting,
  });
  
  background.appendChild(taskBlock);
}

chrome.runtime.sendMessage({ action: "activate" }, function(response: any): void {
  // if (response && response.success) {
  //   activate();
  // }
  return response;
});

function activate(): void {
  setup(chrome.extension.getURL('clarity.js'));
  // const curTaskNum = getCurrentTaskNum();
  // if (curTaskNum == null) {
    localStorage.setItem('currentTask', '1');
    console.log(parseInt(localStorage.getItem('currentTask')))
    promptTask(parseInt(localStorage.getItem('currentTask')));
  // } else if (curTaskNum + 1 <= taskSettings.length) {
  //   loadTaskComponents();
  // }
}

function setup(url: string): void {
  // Execute script in the webpage context
  let script = document.createElement("script");
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', url);
  document.body.appendChild(script);
  
  window.alert = function(al){
    return function(msg) {
        al(msg);
        console.log('aaaaaaabbbbbbbbccccccccc')
        // alert("okbuttonclicked");
    };
}(window.alert);
  window.alert('aaasd');
  
  window.addEventListener("message", function(event: MessageEvent): void {
      if (event.source === window && event.data.action) {
        switch (event.data.action) {
          case "wireup":
            chrome.storage.sync.get({ clarity: { showText: true, leanMode: false } }, (items: any) => {
              let c = config();
              let script = document.createElement("script");
              script.innerText = wireup({
                regions: c.regions,
                metrics: c.metrics,
                dimensions: c.dimensions,
                mask: c.mask,
                unmask: c.unmask,
                showText: items.clarity.showText,
                leanMode: items.clarity.leanMode
              });
              document.body.appendChild(script);
            });
            break;
          case "upload":
            upload(event.data.payload);
            break;
        }
      }
  });  
}

function wireup(settings: any): string {
  let code = ((): void => {
    window["clarity"]("start", {
      delay: 500,
      lean: "$__leanMode__$",
      regions: "$__regions__$",
      metrics: "$__metrics__$",
      dimensions: "$__dimensions__$",
      mask: "$__mask__$",
      unmask: "$__unmask__$",
      content: "$__showText__$",
      upload: (data: string): void => { window.postMessage({ action: "upload", payload: data }, "*"); },
      projectId: "devtools"
    });
  }).toString();
  Object.keys(settings).forEach(s => code = code.replace(`"$__${s}__$"`, JSON.stringify(settings[s])));
  return `(${code})();`;
}

function sendTaskStartSignal(): void {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "http://localhost:80/task-start", true);
  xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
  xhr.send();
}

function sendTaskEndSignal(): void {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "http://localhost:80/task-end", true);
  xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
  xhr.send();
}

function upload(data: string): void {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "http://localhost:80", true);
  xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
  console.log(data)
  xhr.send(data);
}
