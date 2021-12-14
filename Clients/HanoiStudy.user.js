// ==UserScript==
// @name         HanoiStudy Collab
// @namespace    https://trungnt2910.github.io/
// @version      0.0.2
// @description  HanoiCollab Client for HanoiStudy
// @author       trungnt2910
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/HanoiStudy.user.js
// @updateURL    https://raw.githubusercontent.com/trungnt2910/HanoiCollab/master/Clients/HanoiStudy.meta.js
// @match        https://study.hanoi.edu.vn/lam-bai/*
// @icon         https://www.google.com/s2/favicons?domain=edu.vn
// @grant        GM_xmlhttpRequest
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

    function getRealText(element)
    {
        var clone = element.cloneNode(true);
        var mathText = clone.getElementsByClassName("mjx-chtml");
        var mathScript = Array.from(clone.getElementsByTagName("script")).filter(elem => elem.type.startsWith("math/"));
        for (var i = 0; i < mathText.length; ++i)
        {
            mathText[i].parentElement.replaceChild(document.createTextNode(mathScript[i].innerText), mathText[i]);
            mathScript[i].parentElement.replaceChild(document.createTextNode(""), mathScript[i]);
        }
        var img = clone.getElementsByTagName("img");
        for (i = 0; i < img.length; ++i)
        {
            img[i].parentElement.replaceChild(document.createTextNode(img[i].src), img[i]);
        }
        return clone.innerText;
    }

    const server = prompt("Enter your HanoiCollab server", "http://localhost:6969");

    var splittedUserNameAndId = document.getElementsByClassName("show-user-mobile-name")[0].innerText.split(': ', 2)[1].split(' - ', 2);
    var userName = splittedUserNameAndId[0];
    var userId = splittedUserNameAndId[1];

    var nickname = prompt("Enter your HanoiCollab nickname", userName);
    console.log(server + "Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId));

    console.log("Set nickname to: " + await (new Promise((resolve, reject) => GM_xmlhttpRequest({
        method: "POST",
        url: server + "api/Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId),
        data: nickname,
        onload: (r) => {
            resolve(r.responseText);
        }
    }))));

    for (var qb of document.getElementsByClassName("question-box"))
    {
        var btn = document.createElement("button");
        btn.innerHTML = "Clear";
        btn.onclick = function ()
        {
            for (var inp of this.parentElement.getElementsByTagName("input"))
            {
                inp.checked = false;
            }
        }
        qb.appendChild(btn);
    }

    setInterval(async () =>
    {
        // This should run periodically
        var questions = [];
        var bigFatString = "";

        for (var qb of document.getElementsByClassName("question-box"))
        {
            var qbt = qb.getElementsByClassName("question-box-title")[0];
            var question = getRealText(qbt).trim();
            var questionAndAnswers = question;
            var choices = [];
            var userAnswer = null;
            for (var ansbox of Array.from(qb.getElementsByClassName("splip-answer")).sort(
                (a, b) => a.getElementsByTagName("label")[0].htmlFor.localeCompare(b.getElementsByTagName("label")[0].htmlFor)))
            {
                var answer = getRealText(ansbox.getElementsByClassName("text-ans")[0]).trim();
                questionAndAnswers += "\n" + answer;
                bigFatString += answer.getHashCode();
                choices.push({text: answer, hash: answer.getHashCode()});
                if (ansbox.getElementsByTagName("input")[0].checked)
                {
                    userAnswer = answer.getHashCode();
                }
            }
            choices.sort((a, b) => a.text.localeCompare(b.text));
            bigFatString += question.getHashCode();
            for (var choice in choices)
            {
                bigFatString += choice.hash;
            }
            questions.push(
                {
                    text: question,
                    hash: questionAndAnswers.getHashCode(),
                    answers: choices,
                    userAnswer: userAnswer
                }
            );
        }

        questions.sort((a, b) => a.text.localeCompare(b.text));

        var payload =
            {
                user:
                {
                    name: userName,
                    id: userId,
                },
                examHash: bigFatString.getHashCode(),
                questions: questions
            }

        // Re-post our nickname in case the server messed up.
        await (new Promise((resolve, reject) => GM_xmlhttpRequest({
            method: "POST",
            url: server + "api/Nickname?userName=" + encodeURIComponent(userName) + "&userId=" + encodeURIComponent(userId),
            data: nickname,
            onload: (r) => {
                resolve(r.responseText);
            }
        })))

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
            }
        }));

        for (qb of document.getElementsByClassName("question-box"))
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
            question = getRealText(qb.getElementsByClassName("question-box-title")[0]).trim();
            var stats = response.answers[question.getHashCode()];
            for (ansbox of qb.getElementsByClassName("splip-answer"))
            {
                answer = getRealText(ansbox.getElementsByClassName("text-ans")[0]).trim();
                var letter = ansbox.getElementsByTagName("label")[0].innerText.trim();
                div.appendChild(document.createTextNode(letter + " " + stats[answer.getHashCode()].length + ": "));
                for (var user of stats[answer.getHashCode()].data)
                {
                    div.appendChild(document.createTextNode(user.name + ", "));
                }
                div.appendChild(document.createElement("br"));
            }
            qb.appendChild(div);
        }
    }, 5000);
    // Your code here...
})();