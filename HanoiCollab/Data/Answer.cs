using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class Answer
    {
        [JsonProperty("text")]
        public string Text { get; set; }
        [JsonProperty("hash")]
        public string Hash { get; set; }
    }
}
