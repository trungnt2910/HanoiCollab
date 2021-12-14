using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class Exam
    {
        [JsonProperty("questions")]
        public List<Question>? Questions { get; set; }
        [JsonProperty("answers")]
        public Dictionary<string, Dictionary<string, HashSet<User>>>? Answers { get; set; }
    }
}
