// ==UserScript==
// @name         SHUB Collab
// @namespace    https://trungnt2910.github.io/
// @version      0.0.1
// @description  HanoiCollab Client for SHUB
// @author       trungnt2910
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/SHUB.user.js
// @updateURL    https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/SHUB.meta.js
// @match        https://shub.edu.vn/*
// @icon         https://www.google.com/s2/favicons?domain=edu.vn
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-start
// ==/UserScript==

(async function() {
    'use strict';

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
    var userName = localStorage.getItem("name");
    var userId = localStorage.getItem("id");

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

    async function Setup() {
        var matches = location.href.match(/https:\/\/shub\.edu\.vn\/class\/.+?\/homework\/(.+?)\/test/);
        if (matches[1])
        {
            var examId = matches[1];
            console.log("Exam detected. Monitoring user.");

            var cells = await new Promise(function (resolve, reject) 
            {
                var handle = setInterval(function()
                {
                    var temp = document.querySelectorAll('[id^=cell]');
                    if (temp.length > 0)
                    {
                        clearInterval(handle);
                        resolve(temp);
                    }
                }, 200);
            });
            var questionCount = cells.length;

            // SHUB, unlike other providers, lets student do only one question at a time.
            // Students click on a "cell" to activate another question.
            var response = null;
            // Every "click" event and every "update" event modifies these element.
            var userAnswerElement = document.createElement("div");
            userAnswerElement.appendChild(document.createTextNode("User answers:"));
            userAnswerElement.classList.add("carano-user-answers");
            userAnswerElement.appendChild(document.createElement("br"));

            var userAnswerMultipleChoiceStats = document.createElement("div");
            userAnswerMultipleChoiceStats.appendChild(document.createTextNode("Multiple choice:"));
            userAnswerMultipleChoiceStats.classList.add("carano-user-answer-stats");
            userAnswerElement.appendChild(userAnswerMultipleChoiceStats);
            userAnswerElement.appendChild(document.createElement("br"));

            var userAnswerWrittenStats = document.createElement("div");
            userAnswerWrittenStats.appendChild(document.createTextNode("Written:"));
            userAnswerWrittenStats.appendChild(document.createElement("br"));
            userAnswerWrittenStats.classList.add("carano-user-answer-written");
            userAnswerElement.appendChild(userAnswerWrittenStats);
            userAnswerElement.appendChild(document.createElement("br"));

            var userAnswerWrittenSelect = document.createElement("select");
            userAnswerWrittenSelect.classList.add("carano-user-answer-select");
            userAnswerWrittenStats.appendChild(userAnswerWrittenSelect);
            userAnswerWrittenStats.appendChild(document.createElement("br"));

            var userAnswerWrittenText = document.createElement("div");
            userAnswerWrittenText.classList.add("carano-user-answer-text");
            userAnswerWrittenStats.appendChild(userAnswerWrittenText);
            userAnswerWrittenStats.appendChild(document.createElement("br"));

            var activeCell = 0;
            var inactiveCellInfo = Array(questionCount);

            userAnswerWrittenSelect.addEventListener("change", async function()
            {
                var value = JSON.parse(this.value);
                inactiveCellInfo[value.index] = value.info;

                var questionId = examId + "_" + activeCell;

                var text = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                    method: "GET",
                    url: server + "api/WrittenAnswer?questionId=" + questionId + "&userId=" + inactiveCellInfo[activeCell].user.id,
                    onload: (r) => {
                        resolve(r.responseText ? r.responseText : "");
                    },
                    onerror: (r) => {
                        resolve(r.statusText);
                    }
                }));

                userAnswerWrittenText.innerText = "";
                userAnswerWrittenText.appendChild(document.createTextNode(text));
            });

            async function UpdateUserAnswer()
            {
                var questionId = examId + "_" + activeCell;
                if (response)
                {
                    if (response.answers && response.answers[questionId])
                    {
                        var stats = response.answers[questionId];
                        userAnswerMultipleChoiceStats.innerText = "";
                        for (var letter of ["A", "B", "C", "D"])
                        {
                            userAnswerMultipleChoiceStats.appendChild(document.createTextNode(letter + " " + stats[letter].length + ": "));
                            for (var user of stats[letter].data)
                            {
                                userAnswerMultipleChoiceStats.appendChild(document.createTextNode(user.name + ", "));
                            }
                            userAnswerMultipleChoiceStats.appendChild(document.createElement("br"));
                        }
                    }
                    if (response.writtenAnswers && response.writtenAnswers[questionId])
                    {
                        userAnswerWrittenSelect.innerText = "";
                        for (var info of response.writtenAnswers[questionId])
                        {
                            var currentValue = JSON.stringify({info: info, index: activeCell});
                            userAnswerWrittenSelect.add(new Option(info.user.name + ", " + info.length + " characters", currentValue));
                            if (inactiveCellInfo[activeCell] && inactiveCellInfo[activeCell].user.id == info.user.id)
                            {
                                userAnswerWrittenSelect.value = currentValue;
                            }
                        }
                        inactiveCellInfo[activeCell] = JSON.parse(userAnswerWrittenSelect.value).info;

                        var text = await new Promise((resolve, reject) => GM_xmlhttpRequest({
                            method: "GET",
                            url: server + "api/WrittenAnswer?questionId=" + questionId + "&userId=" + inactiveCellInfo[activeCell].user.id,
                            onload: (r) => {
                                resolve(r.responseText ? r.responseText : "");
                            },
                            onerror: (r) => {
                                resolve(r.statusText);
                            }
                        }));

                        userAnswerWrittenText.innerText = "";
                        userAnswerWrittenText.appendChild(document.createTextNode(text));
                    }
                }
            }

            for (var cell of cells)
            {
                cell.addEventListener("click", function (e)
                {
                    activeCell = Number.parseInt(e.target.closest("[id^=cell]").id.substring("cell-".length));
                    UpdateUserAnswer();
                });
            }

            // Ensure this event's fired for the first cell.
            cells[0].click();
            // This is the root box that holds all "cell"s and the input box.
            document.querySelectorAll('[id^=cell]')[0].closest([".MuiBox-root"])
                    .appendChild(userAnswerElement);

            return setInterval(async function()
            {
                // This should run periodically

                var questions = [];
                var writtenQuestions = [];

                var result = JSON.parse(localStorage.getItem("test_result"));

                for (var i = 0; i < questionCount; ++i)
                {
                    var userAnswer = null;
                    // result MAY be null if the user has not completed any questions.
                    if (result && result[examId] && result[examId][i])
                    {
                        userAnswer = result[examId][i];
                    }

                    // SHUB does not have dedicated multiple choice question type,
                    // but all of its questions are fill-ins. "Multiple choice" questions
                    // are questions when you fill in one letter only: A, B, C or D.
                    if (!userAnswer || ["A", "B", "C", "D"].includes(userAnswer))
                    {
                        questions.push({
                            text: "",
                            hash: examId + "_" + i,
                            answers: [{text: "A", hash: "A"}, {text: "B", hash: "B"}, {text: "C", hash: "C"}, {text: "D", hash: "D"}],
                            userAnswer: (userAnswer === "") ? null : userAnswer,
                        });
                        writtenQuestions.push(
                            {
                                text: "",
                                hash: examId + "_" + i,
                                // To-Do: Support more paragraphs in a written answer?
                                userAnswer: null
                            }
                        );
                    }
                    else
                    {
                        // We still have to update both.
                        // Sometimes questions can switch types, feed a null answer to clear 
                        // our old footprint.
                        questions.push({
                            text: "",
                            hash: examId + "_" + i,
                            answers: [{text: "A", hash: "A"}, {text: "B", hash: "B"}, {text: "C", hash: "C"}, {text: "D", hash: "D"}],
                            userAnswer: null,
                        });
                        writtenQuestions.push(
                            {
                                text: "",
                                hash: examId + "_" + i,
                                // To-Do: Support more paragraphs in a written answer?
                                userAnswer: userAnswer
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
                    examHash: examId,
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
                
                response = await new Promise((resolve, reject) => GM_xmlhttpRequest({
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
                
                await UpdateUserAnswer();

            }, 5000);
        }
    }

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