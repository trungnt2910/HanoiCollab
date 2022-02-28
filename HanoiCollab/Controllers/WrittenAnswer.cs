using HanoiCollab.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace HanoiCollab.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WrittenAnswer : ControllerBase
    {
        [HttpGet]
        public IActionResult Get(string questionId, string userId)
        {
            try
            {
                return Content(Update.GetWrittenAnswer(questionId, userId));
            }
            catch (Exception ex)
            {
                return NotFound(ex.ToString());
            }
        }
    }
}