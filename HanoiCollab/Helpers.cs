namespace HanoiCollab
{
    public static class Helpers
    {
        public static string KeepFirst(this string s, int length)
        {
            return s.Substring(0, Math.Min(s.Length, length));
        }
    }
}
