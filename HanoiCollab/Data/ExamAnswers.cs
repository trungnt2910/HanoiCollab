using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class ExamAnswers
    {
        [JsonProperty("answers")]
        public Dictionary<string, Dictionary<string, PartialSet<User>>> Answers { get; set; }

        [JsonProperty("writtenAnswers")]
        public Dictionary<string, List<WrittenAnswerPreview>> WrittenAnswers { get; set; }

        public ExamAnswers()
        {

        }

        public ExamAnswers(Exam exam)
        {
            Answers = new();
            foreach (var kvp in exam.Answers)
            {
                var tempDict = new Dictionary<string, PartialSet<User>>();
                foreach (var inner_kvp in kvp.Value)
                {
                    tempDict.Add(inner_kvp.Key, new PartialSet<User>(inner_kvp.Value, 10));
                }
                Answers.Add(kvp.Key, tempDict);
            }
        }
    }
}
