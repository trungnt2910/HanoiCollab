using HanoiCollab.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace HanoiCollab.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Nickname : ControllerBase
    {
        private static readonly Dictionary<User, string> _nickNames = new();
        private static readonly object _locker = new();

        public const int MaxLength = 16;

        public static string GetName(User user)
        {
            if (_nickNames.ContainsKey(user))
            {
                return _nickNames[user];
            }
            return user.Name;
        }

        [HttpGet]
        public IActionResult Get(string userName, string userId)
        {
            var user = new User()
            {
                Name = userName,
                Id = userId
            };

            lock (_locker)
            {
                if (_nickNames.ContainsKey(user))
                {
                    return Ok(_nickNames[user]);
                }
                return Ok(userName);
            }
        }

        [HttpPost]
        public async Task<IActionResult> Post(string userName, string userId)
        {
            using var sw = new StreamReader(Request.Body);
            var name = await sw.ReadToEndAsync();

            name = name.KeepFirst(MaxLength);

            var user = new User()
            {
                Name = userName,
                Id = userId
            };
            try
            {
                lock (_locker)
                {
                    if (!_nickNames.ContainsKey(user))
                    {
                        _nickNames.Add(user, name);
                    }
                    else
                    {
                        _nickNames[user] = name;
                    }
                    Console.WriteLine($"Set nickname of: {userName}, {userId} to {name}");
                    return Ok(name);
                }
            }
            catch (Exception e)
            {
                return BadRequest(e.ToString());
            }
        }
    }
}
