using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class WrittenAnswerPreview
    {
        [JsonProperty("user")]
        public User User { get; set; }
        [JsonProperty("length")]
        public int Length { get; set; }
    }
}
