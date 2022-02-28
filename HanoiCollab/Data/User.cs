using Newtonsoft.Json;

namespace HanoiCollab.Data
{
    public class User
    {
        [JsonProperty("id")]
        public string Id { get; set; }
        [JsonProperty("name")]
        public string Name { get; set; }
        
        public override bool Equals(object obj)
        {
            var other = obj as User;
            if (other == null)
            {
                return false;
            }

            return Id == other.Id && Name == other.Name;
        }
        public override int GetHashCode()
        {
            return (Id?.GetHashCode() ?? 0) ^ (Name?.GetHashCode() ?? 0);
        }
    }
}
