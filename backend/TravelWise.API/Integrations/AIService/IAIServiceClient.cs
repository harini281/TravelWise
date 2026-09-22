using TravelWise.API.DTOs;

namespace TravelWise.API.Integrations.AIService;

public interface IAIServiceClient
{
    Task<AIWorkflowRunResponseDto> RunTripWorkflowAsync(int tripId, int? workflowId = null);
}
