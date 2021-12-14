using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class Question
    {
        [JsonProperty("text")]
        public string? Text { get; set; }
        [JsonProperty("hash")]
        public string? Hash { get; set; }
        [JsonProperty("answers")]
        public List<Answer>? Answers { get; set; }
        [JsonProperty("userAnswer")]
        public string? UserAnswer { get; set; }
    }
}
