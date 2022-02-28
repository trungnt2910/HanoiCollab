// ==UserScript==
// @name         Azota Collab
// @namespace    https://trungnt2910.github.io/
// @version      0.0.1
// @description  HanoiCollab Client for Azota
// @author       trungnt2910
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/Azota.user.js
// @updateURL    https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/Azota.meta.js
// @match        https://azota.vn/*
// @icon         https://www.google.com/s2/favicons?domain=edu.vn
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-start
// ==/UserScript==

(async function() {
    'use strict';
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
    var userObj = JSON.parse(localStorage.getItem("user_obj"));
    var userName = userObj.fullName;
    var userId = userObj.id;

    var nickname = localStorage.getItem("HanoiCollabNickname");
    if (!nickname)
    {
        nickname = prompt("Enter your HanoiCollab nickname", userName);
        localStorage.setItem("HanoiCollabNickname", nickname);
    }

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

    unsafeWindow.HanoiCollabExposedVariables = [];

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://cdn.jsdelivr.net/gh/azota889/frontend/angular/14-es2015.b9eebba3b83b49db3192.js",
        onload: function(response) {
            var oldText = response.responseText;
            var regex = /constructor\(.*?\){/gm;
            var newText = oldText.replace(regex, (match) => match + "HanoiCollabExposedVariables.push(this);");
            var newScript = document.createElement('script');
            newScript.type = "text/javascript";
            newScript.textContent = newText;
            var head = document.getElementsByTagName('head')[0];
            head.appendChild(newScript);
        }
    });

    async function Setup() {
        if (location.pathname.search("take-test") != -1)
        {
            console.log("Detected test. Monitoring user.");
            var testInfo = await new Promise((resolve, reject) => 
            {
                var id = setInterval(function()
                {
                    HanoiCollabExposedVariables.forEach(function(obj) 
                    {
                        if (obj.questionList)
                        {
                            clearInterval(id);
                            resolve(obj);
                        }
                    });
                }, 200);
            });
            console.log(testInfo);

            // Wait for elements to load
            await new Promise((resolve, reject) => 
            {
                var id = setInterval(function()
                {
                    if (document.getElementsByClassName("question-content").length != 0)
                    {
                        clearInterval(id);
                        resolve();
                    }
                }, 200);
            });

            // Creating the "clear" button
            for (var qb of document.getElementsByClassName("question-content"))
            {
                var btn = document.createElement("button");
                btn.innerHTML = "Clear";
                btn.onclick = function ()
                {
                    var currentQb = this.closest(".question-content");
                    var id = Number.parseInt(currentQb.id.substring(currentQb.id.lastIndexOf("_") + 1));
                    var questionId = testInfo.questionList[id].id;
                    var answerIndex = testInfo.answerList.findIndex(function(elem) { return elem.questionId == questionId; } );
                    testInfo.answerList.splice(answerIndex, 1);
                    testInfo.questionList[id].status = false;
                    // Multiple choice
                    if (testInfo.questionList[id].answerType == 1)
                    {
                        // UI
                        for (var ab of currentQb.getElementsByClassName("no-answered"))
                        {
                            ab.style.backgroundColor = null;
                            ab.style.background = "#fff";
                            ab.style.color = "#111";
                        }
                        // Internal state
                        for (var aConf of testInfo.questionList[id].answerConfig)
                        {
                            aConf.checked = false;
                        }
                    }
                    // Non-multiple choice
                    else
                    {
                        for (var ab of currentQb.getElementsByTagName("textarea"))
                        {
                            ab.value = "";
                        }
                    }
                    testInfo.saveToStorage(testInfo.answerList, testInfo.noteList, testInfo.files);
                    // some more UI
                    var statusButton = document.getElementsByClassName("sheet_content")[0].getElementsByClassName("no-answered")[id];
                    statusButton.style.backgroundColor = null;
                    statusButton.style.background = "#fff";
                    statusButton.style.color = "#111";
                }
                qb.getElementsByClassName("answer-content")[0].appendChild(btn);
            }

            return setInterval(async () => 
            {
                // This should run periodically
                var questions = [];

                for (var q of testInfo.questionList)
                {
                    var choices = [];
                    var userAnswer = null;

                    if (q.answerType == 1)
                    {
                        for (var a of q.answerConfig)
                        {
                            choices.push({text: a.key, hash: a.key});
                            if (a.checked)
                            {
                                userAnswer = a.key;
                            }
                        }
                        questions.push(
                            {
                                text: "",
                                hash: q.id,
                                answers: choices,
                                userAnswer: userAnswer
                            }
                        );
                    }
                }

                var payload =
                {
                    user:
                    {
                        name: testInfo.userObj.fullName,
                        id: testInfo.userObj.id,
                    },
                    examHash: testInfo.exam_obj.id,
                    questions: questions
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
                    for (qb of document.getElementsByClassName("question-content"))
                    {
                        var oldChild = qb.getElementsByClassName("carano-user-answer-stats")[0];
                        if (oldChild)
                        {
                            qb.removeChild(oldChild);
                        }
                        var div = document.createElement("div");
                        div.classList.add("carano-user-answer-stats");
                        div.appendChild(document.createTextNode("User Answers: "));
                        div.appendChild(document.createElement("br"));
                        var index = Number.parseInt(qb.id.substring(qb.id.lastIndexOf("_") + 1));
                        var currentQuestion = testInfo.questionList[index];
                        var stats = response.answers[currentQuestion.id];
                        for (var ansConf of currentQuestion.answerConfig)
                        {
                            var letter = ansConf.alpha;
                            div.appendChild(document.createTextNode(letter + " " + stats[ansConf.key].length + ": "));
                            for (var user of stats[ansConf.key].data)
                            {
                                div.appendChild(document.createTextNode(user.name + ", "));
                            }
                            div.appendChild(document.createElement("br"));
                        }
                        qb.appendChild(div);
                    }
                }

            }, 5000);
        }
    }

    let lastUrl = location.href; 
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            onUrlChange();
        }
    }).observe(document, {subtree: true, childList: true});
    
    var currentInterval = await Setup();

    async function onUrlChange() {
        clearInterval(currentInterval);
        currentInterval = await Setup();
    }
    // Your code here...
})();