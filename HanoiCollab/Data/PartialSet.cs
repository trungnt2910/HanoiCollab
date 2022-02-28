using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class PartialSet<T>
    {
        [JsonProperty("length")]
        public int Count { get; set; }
        [JsonProperty("data")]
        public T[] Data { get; set; }

        public PartialSet()
        {

        }

        public PartialSet(IEnumerable<T> elements, int maxCount)
        {
            Data = elements.Take(maxCount).ToArray();
            Count = elements.Count();
        }
    }
}
