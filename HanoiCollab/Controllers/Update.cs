using HanoiCollab.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace HanoiCollab.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Update : ControllerBase
    {
        const int DisplayNamesPerAnswer = 10;

        private static readonly Dictionary<string, Dictionary<string, HashSet<User>>> _questions = new();

        // We must use the ID as the key, else we cannot query by ID in the future.
        private static readonly Dictionary<string, Dictionary<string, (User User, string Answer)>> _writtenQuestions = new();

        private static readonly object _locker = new();

        [HttpGet]
        public IActionResult Get(string questionHash)
        {
            Dictionary<string, HashSet<User>> question;

            lock (_locker)
            {
                question = _questions.GetValueOrDefault(questionHash);
            }

            if (question == null)
            {
                return NotFound();
            }

            Dictionary<string, PartialSet<User>> toReturn = new();
            foreach (var kvp in question)
            {
                toReturn.Add(kvp.Key, new PartialSet<User>(kvp.Value, 5));
            }

            return Content(JsonConvert.SerializeObject(toReturn));
        }

        [HttpPost]
        public async Task<IActionResult> Post()
        {
            using var sw = new StreamReader(Request.Body);
            var json = await sw.ReadToEndAsync();
            
            try
            {
                var submission = JsonConvert.DeserializeObject<Submission>(json);

                #region Dumb Null Checks
                if (submission == null)
                {
                    return BadRequest("Null Submission");
                }

                if (submission.User == null || submission.Questions == null || submission.ExamHash == null)
                {
                    return BadRequest("Malformed submission");
                }

                foreach (var q in submission.Questions)
                {
                    if (q.Hash == null || q.Answers == null)
                    {
                        return BadRequest("Malformed submission");
                    }
                    foreach (var a in q.Answers)
                    {
                        if (a.Hash == null)
                        {
                            return BadRequest("Malformed submission");
                        }
                    }
                }
                #endregion

                var toReturn = new ExamAnswers();
                toReturn.Answers = new();

                foreach (var q in submission.Questions)
                {
                    Dictionary<string, HashSet<User>> questionInfo;

                    lock (_questions)
                    {
                        questionInfo = _questions.GetValueOrDefault(q.Hash);
                        if (questionInfo == null)
                        {
                            questionInfo = new();
                            Console.WriteLine($"Adding new question with hash: {q.Hash}");
                            foreach (var a in q.Answers)
                            {
                                // Read the comment about clashing answers below.
                                questionInfo.TryAdd(a.Hash, new HashSet<User>());
                            }

                            _questions.Add(q.Hash, questionInfo);
                        }
                        else
                        {
                            // There might be clashing answers, we don't wanna fail the whole server
                            // for this.
                            //if (q.Answers.Count != questionInfo.Count)
                            //{
                            //    return BadRequest("Malformed submission");
                            //}
                            // However, we're still checking for the integrity of the submission.
                            // If the submission contains a _different_ answer, we fail the request.
                            foreach (var a in q.Answers)
                            {
                                if (!questionInfo.ContainsKey(a.Hash))
                                {
                                    return BadRequest("Malformed submission");
                                }
                            }
                        }

                        var toReturnDict = new Dictionary<string, PartialSet<User>>();

                        foreach (var kvp in questionInfo)
                        {
                            if (kvp.Key == q.UserAnswer)
                            {
                                kvp.Value.Add(submission.User);
                            }
                            else
                            {
                                kvp.Value.Remove(submission.User);
                            }
                            toReturnDict.Add(kvp.Key,
                                new PartialSet<User>(
                                    kvp.Value.Select(u => new User() { Name = Nickname.GetName(u), Id = u.Id })
                                    , DisplayNamesPerAnswer));
                        }

                        // For some reasons, there are questions with the same hash. Allow them too.
                        toReturn.Answers.TryAdd(q.Hash, toReturnDict);
                    }
                }

                if (submission.WrittenQuestions.Any())
                {
                    toReturn.WrittenAnswers = new();
                    foreach (var wQ in submission.WrittenQuestions)
                    {
                        lock (_writtenQuestions)
                        {
                            var questionInfo = _writtenQuestions.GetValueOrDefault(wQ.Hash);
                            if (questionInfo == null)
                            {
                                questionInfo = new();
                                Console.WriteLine($"Adding new written question with hash: {wQ.Hash}");
                                _writtenQuestions.Add(wQ.Hash, questionInfo);
                            }

                            var toReturnList = new List<WrittenAnswerPreview>();

                            lock (questionInfo)
                            {
                                if (questionInfo.ContainsKey(submission.User.Id))
                                {
                                    questionInfo[submission.User.Id] = (submission.User, wQ.UserAnswer);
                                }
                                else
                                {
                                    questionInfo.Add(submission.User.Id, (submission.User, wQ.UserAnswer));
                                }

                                foreach (var kvp in questionInfo)
                                {
                                    toReturnList.Add(
                                        new WrittenAnswerPreview()
                                        {
                                            User = new User() { Name = Nickname.GetName(kvp.Value.User), Id = kvp.Value.User.Id },
                                            Length = kvp.Value.Answer?.Length ?? 0
                                        }
                                    );
                                }
                            }

                            toReturnList.Sort((a, b) =>
                            {
                                var comp1 = -a.Length.CompareTo(b.Length);
                                if (comp1 == 0)
                                {
                                    return a.User.Id.CompareTo(b.User.Id);
                                }
                                else
                                {
                                    return comp1;
                                }
                            });

                            toReturn.WrittenAnswers.TryAdd(wQ.Hash, toReturnList);
                        }
                    }
                }

                return Content(JsonConvert.SerializeObject(toReturn));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.ToString());
            }
        }

        public static string GetWrittenAnswer(string questionId, string userID)
        {
            return _writtenQuestions[questionId][userID].Answer;
        }
    }
}
