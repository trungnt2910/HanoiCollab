// ==UserScript==
// @name         Office Forms Collab
// @namespace    https://trungnt2910.github.io/
// @version      0.0.3
// @description  HanoiCollab Client for SHUB
// @author       trungnt2910
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/OfficeForms.user.js
// @updateURL    https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/OfficeForms.meta.js
// @match        https://forms.office.com/Pages/ResponsePage.aspx?*
// @icon         https://www.google.com/s2/favicons?domain=edu.vn
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-start
// ==/UserScript==

(async function() {
    'use strict';

    // We mostly won't be able to control script loading on this document,
    // so we're gonna create a NEW document on an iframe.
    // The script will be patched before getting into this frame.
    var document = await new Promise(function (resolve, reject)
    {
        var handle = setInterval(function ()
        {
            if (unsafeWindow.document && unsafeWindow.document.body)
            {
                clearInterval(handle);
                resolve(unsafeWindow.document);
            }
        }, 100);
    });

    var style = document.createElement("style");
    style.innerText = `body {
       margin: 0;
       overflow: hidden;
    }
    #iframe1 {
        position:absolute;
        left: 0px;
        width: 100%;
        top: 0px;
        height: 100%;
    }`;
    document.body.textContent = "";
    document.body.appendChild(style);
    var frame = document.createElement("iframe");
    frame.id = "iframe1";
    document.body.appendChild(frame);
    var request = new XMLHttpRequest();
    request.open("GET", location.href, false);
    request.send(null);
    var parser = new DOMParser();
    var htmlDoc = parser.parseFromString(request.responseText, 'text/html');

    for (var script of htmlDoc.documentElement.getElementsByTagName("script"))
    {
        if (script.src.includes("page.min"))
        {
            var scriptSource = script.src;
            script.removeAttribute("src");
            var request = new XMLHttpRequest();
            request.open("GET", scriptSource, false);
            request.send(null);
            var scriptContent = request.responseText;

            const patches = [
                {
                    // Form state
                    oldCode: "return(e=e||c.length!==Object.keys(n).length)?i:n",
                    newCode: "return(e=e||c.length!==Object.keys(n).length)?(function(i){window.HanoiCollabExposedVariables=window.HanoiCollabExposedVariables||[];window.HanoiCollabExposedVariables.formState=i;return i})(i):n"
                },
                {
                    // Flush local storage
                    oldCode: "function f(n){var r=(0,o.cF)",
                    newCode: "function f(n){window.HanoiCollabExposedVariables=window.HanoiCollabExposedVariables||[];window.HanoiCollabExposedVariables.updateLocalStorage=f;var r=(0,o.cF)"
                }
            ];

            for (var {oldCode, newCode} of patches)
            {
                scriptContent = scriptContent.replace(oldCode, newCode);
            }

            script.textContent = scriptContent;
        }
    }
    var blob = new Blob([htmlDoc.documentElement.outerHTML], {type: "text/html"});
    
    document = await new Promise(function (resolve, reject) 
    {
        frame.onload = function()
        {
            resolve(frame.contentDocument);
        }
        frame.src = URL.createObjectURL(blob);
    });
    window = frame.contentWindow;

    String.prototype.getHashCode = function() {
        var hash = 0, i, chr;
        if (this.length === 0) return hash;
        for (i = 0; i < this.length; i++) {
            chr   = this.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash.toString();
    };

    // Set up our server
    var server = localStorage.getItem("HanoiCollabServer");
    if (!server)
    {
        server = prompt("Enter your HanoiCollab server", "http://localhost:6969");
        if (!server.endsWith("/"))
        {
            server = server + "/";
        }
        localStorage.setItem("HanoiCollabServer", server);
    }

    document.addEventListener('keyup', function (e)
    {
        if (e.altKey && e.key === 's')
        {
            server = prompt("Enter your HanoiCollab server", server);
            if (server)
            {
                if (!server.endsWith("/"))
                {
                    server = server + "/";
                }
                localStorage.setItem("HanoiCollabServer", server);
                console.log("Set server to: " + server);
            }
        }
    }, false);

    // Identity
    var userId = (await cookieStore.get("MUID")).value.getHashCode();

    var nickname = localStorage.getItem("HanoiCollabNickname");
    if (!nickname)
    {
        nickname = prompt("Enter your HanoiCollab nickname", "Anonymous");
        localStorage.setItem("HanoiCollabNickname", nickname);
    }

    // This time, our nickname _IS_ our username.
    // Office doesn't provide a way to fetch the real name.
    var userName = nickname;

    GM_xmlhttpRequest({
        method: "POST",
        url: server + "api/Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId),
        data: nickname,
        onload: function (r) {
            console.log("Set nickname to: " + r.responseText);
        },
        onerror: function (r) {
            console.log("Failed to set nickname: " + r.statusText);
        }
    });

    document.addEventListener('keyup', function (e)
    {
        if (e.altKey && e.key === 'n')
        {
            nickname = prompt("Enter your HanoiCollab nickname", nickname);
            if (nickname)
            {
                localStorage.setItem("HanoiCollabNickname", nickname);
                GM_xmlhttpRequest({
                    method: "POST",
                    url: server + "api/Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId),
                    data: nickname,
                    onload: function (r) {
                        console.log("Set nickname to: " + r.responseText);
                    },
                    onerror: function (r) {
                        console.log("Failed to set nickname: " + r.statusText);
                    }
                });
            }
        }
    }, false);

    async function Setup()
    {
        // This time, we're waiting for... "office-form-question-content"
        var questionContents = await new Promise(function (resolve, reject)
        {
            var handle = setInterval(function()
            {
                var temp = document.getElementsByClassName("office-form-question-content");
                if (temp.length > 0)
                {
                    clearInterval(handle);
                    resolve(temp);
                }
            }, 200);
        });

        await new Promise(function (resolve, reject)
        {
            var handle = setInterval(function()
            {
                if (window.HanoiCollabExposedVariables.formState)
                {
                    clearInterval(handle);
                    resolve();
                }
            }, 200);
        });

        if (window.HanoiCollabExposedVariables.formState.$bE)
        {
            var userInfo = window.HanoiCollabExposedVariables.formState.$bE;
            if (userInfo.userId && userInfo.displayName)
            {
                userId = userInfo.userId;
                userName = userInfo.displayName;

                // Re-register our identity.
                GM_xmlhttpRequest({
                    method: "POST",
                    url: server + "api/Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId),
                    data: nickname,
                    onload: function (r) {
                        console.log("Set nickname to: " + r.responseText);
                    },
                    onerror: function (r) {
                        console.log("Failed to set nickname: " + r.statusText);
                    }
                });
            }
        }

        function IsMultipleChoice(questionContent)
        {
            var temp = questionContent.getElementsByClassName("office-form-question-choice");
            return temp.length > 0;
        }

        function IsWritten(questionContent)
        {
            var temp = questionContent.getElementsByClassName("office-form-question-text");
            return temp.length > 0;
        }

        var oldQuestionState = window.HanoiCollabExposedVariables.formState.$$.$e;
        var firstQuestion = questionContents[0];
        // Triggering local storage.
        if (IsMultipleChoice(firstQuestion))
        {
            var choices = firstQuestion.getElementsByTagName("input");
            var oldChoiceState = Array(choices.length);
            for (var i = 0; i < choices.length; ++i)
            {
                oldChoiceState[i] = choices[i].checked;
            }
            var input = choices[0];
            input.checked = false;
            input.click();
            for (var i = 0; i < choices.length; ++i)
            {
                choices[i].checked = oldChoiceState[i];
            }
        }
        else
        {
            var input = firstQuestion.getElementsByTagName("input")[0];
            var oldValue = input.value;
            input.value = "lmao";
            input.dispatchEvent(new Event("input"));
            input.value = oldValue;
            input.dispatchEvent(new Event("input"));
        }

        function GetId(questionContent)
        {
            var titleBox = questionContent.getElementsByClassName("question-title-box")[0];
            var id = titleBox.id.substring("QuestionId_".length);
            return id;
        }

        function ClearAnswer(questionContent)
        {
            var id = GetId(questionContent);
            if (IsMultipleChoice(questionContent))
            {
                for (var input of questionContent.getElementsByTagName("input"))
                {
                    input.checked = false;
                }
                // Array of selected answers.
                // DON'T ASK ME WHAT THE SYMBOLS MEAN!
                window.HanoiCollabExposedVariables.formState.$$.$e[id].runtime.$c = [];
            }
            else
            {
                var input = questionContent.getElementsByTagName("input")[0];
                input.value = "";
                // String, containing the answer.
                // AGAIN, DON'T ASK ME WHAT THE SYMBOLS MEAN!
                window.HanoiCollabExposedVariables.formState.$$.$e[id].runtime.$c = "";
            }
            // We have triggered local storage before, this should be available.
            window.HanoiCollabExposedVariables.updateLocalStorage(window.HanoiCollabExposedVariables.formState.$$);
        }

        // Restore old form state. We've already restored the UI state.
        window.HanoiCollabExposedVariables.formState.$$.$e = oldQuestionState;
        window.HanoiCollabExposedVariables.updateLocalStorage(window.HanoiCollabExposedVariables.formState.$$);

        // Set up our nice little "Clear" button.
        for (var questionContent of questionContents)
        {
            var clearButton = document.createElement("button");
            clearButton.innerText = "Clear";
            clearButton.addEventListener("click", function ()
            {
                ClearAnswer(this.parentElement);
            });

            questionContent.appendChild(clearButton);
        }

        var updateWritten = true;

        return setInterval(async function ()
        {
            // This should run periodically
            var questions = [];
            var writtenQuestions = [];

            for (var id in window.HanoiCollabExposedVariables.formState.$$.$e)
            {
                var q = window.HanoiCollabExposedVariables.formState.$$.$e[id];
                var choices = [];
                var userAnswer = null;

                if (q.info.type == "Question.Choice")
                {
                    for (var a of q.info.choices)
                    {
                        var hash = a.description.getHashCode();
                        choices.push({text: /*a.description Text doesn't matter, anyway*/ "", hash: hash});
                        if (q.runtime.$c.length && q.runtime.$c[0] == a.description)
                        {
                            userAnswer = hash;
                        }
                    }
                    questions.push(
                        {
                            text: "",
                            hash: id,
                            answers: choices,
                            userAnswer: userAnswer
                        }
                    );
                }
                else if (updateWritten)
                {
                    writtenQuestions.push(
                        {
                            text: "",
                            hash: id,
                            userAnswer: q.runtime.$c
                        }
                    );
                }
            }

            var payload =
            {
                user:
                {
                    name: userName,
                    id: userId,
                },
                examHash: window.HanoiCollabExposedVariables.formState.$$.$H.getHashCode(),
                questions: questions,
                writtenQuestions: writtenQuestions
            };

            // Re-post our nickname in case the server messed up.
            GM_xmlhttpRequest({
                method: "POST",
                url: server + "api/Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId),
                data: nickname,
                onload: function (r) {
                },
                onerror: function (r) {
                    console.log("Failed to set nickname: " + r.statusText);
                }
            });

            var response = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                method: "POST",
                url: server + "api/Update",
                data: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json"
                },
                onload: (r) => {
                    console.log(r.responseText);
                    resolve(JSON.parse(r.responseText));
                },
                onerror: (r) => {
                    // Gracefully fail
                    console.log("Failed to sync answers.");
                    resolve(null);
                }
            }));

            if (response)
            {
                for (var questionContent of questionContents)
                {
                    var oldChild = questionContent.getElementsByClassName("carano-user-answer-stats")[0];
                    if (oldChild)
                    {
                        questionContent.removeChild(oldChild);
                    }
                    var div = document.createElement("div");
                    div.classList.add("carano-user-answer-stats");
                    div.appendChild(document.createTextNode("User Answers: "));
                    div.appendChild(document.createElement("br"));
                    var id = GetId(questionContent);
                    var stats = response.answers[id];
                    if (IsMultipleChoice(questionContent))
                    {
                        var q = window.HanoiCollabExposedVariables.formState.$$.$e[id];
                        var letterCode = 'A'.charCodeAt(0);
                        for (var a of q.info.choices)
                        {
                            var letter = String.fromCodePoint(letterCode);
                            div.appendChild(document.createTextNode(letter + " " + stats[a.description.getHashCode()].length + ": "));
                            for (var user of stats[a.description.getHashCode()].data)
                            {
                                div.appendChild(document.createTextNode(user.name + ", "));
                            }
                            div.appendChild(document.createElement("br"));
                            ++letterCode;
                        }
                    }
                    else
                    {
                        if (response.writtenAnswers)
                        {
                            let oldValue = null;
                            if (oldChild)
                            {
                                var elem = oldChild.getElementsByClassName("carano-user-answer-select")[0];
                                if (elem)
                                {
                                    oldValue = JSON.parse(elem.value);
                                }
                            }

                            var select = document.createElement("select");
                            select.classList.add("carano-user-answer-select");

                            for (var info of response.writtenAnswers[id])
                            {
                                var currentValue = JSON.stringify(info);
                                select.add(new Option(info.user.name + ", " + info.length + " characters", currentValue));
                                if (oldValue && oldValue.user.id == info.user.id)
                                {
                                    select.value = currentValue;
                                }
                            }

                            async function SetSelectValue()
                            {
                                var info = JSON.parse(this.value);

                                var text = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                                    method: "GET",
                                    url: server + "api/WrittenAnswer?questionId=" + encodeURIComponent(id) + "&userId=" + encodeURIComponent(info.user.id),
                                    onload: (r) => {
                                        resolve(r.responseText);
                                    },
                                    onerror: (r) => {
                                        resolve(r.statusText);
                                    }
                                }));

                                var textElement = document.createElement("div");
                                if (text)
                                {
                                    for (var line of text.split("\n"))
                                    {
                                        textElement.append(document.createTextNode(line));
                                        textElement.append(document.createElement("br"));
                                    }
                                }
                                textElement.classList.add("carano-user-answer-text");

                                var parent = this.parentElement;
                                // Remove right before append, to avoid glitches.
                                var oldText = parent.getElementsByClassName("carano-user-answer-text")[0];
                                if (oldText)
                                {
                                    parent.removeChild(oldText);
                                }

                                parent.appendChild(textElement);
                            }

                            select.addEventListener("change", SetSelectValue);

                            div.appendChild(select);

                            SetSelectValue.call(select);
                        }
                        else if (oldChild)
                        {
                            var oldSelect = oldChild.getElementsByClassName("carano-user-answer-select")[0];
                            var oldText = oldChild.getElementsByClassName("carano-user-answer-text")[0];
                            if (oldSelect)
                            {
                                div.appendChild(oldSelect);
                            }
                            if (oldText)
                            {
                                div.appendChild(oldText);
                            }
                        }
                    }
                    questionContent.appendChild(div);
                }
            }

            updateWritten = !updateWritten;
        }, 5000);
    }

    // Microsoft Forms don't have this SPA bullshit iirc,
    // but let's just keep this, to be sure.
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            OnUrlChange();
        }
    }).observe(document, {subtree: true, childList: true});

    var currentInterval = await Setup();

    async function OnUrlChange()
    {
        if (currentInterval)
        {
            clearInterval(currentInterval);
        }
        currentInterval = await Setup();
    }
    // Your code here...
})();