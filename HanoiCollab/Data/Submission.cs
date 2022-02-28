using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class Submission
    {
        [JsonProperty("user")]
        public User User { get; set; }
        [JsonProperty("examHash")]
        public string ExamHash { get; set; }
        [JsonProperty("questions")]
        public List<Question> Questions { get; set; }
        [JsonProperty("writtenQuestions")]
        public List<Question> WrittenQuestions { get; set; }
    }
}
