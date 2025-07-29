
# AutoGen Studio Testing Guide

## 1. Setup and Installation

1. Install dependencies:
   ```bash
   cd python-service
   pip install -r requirements.txt
   ```

2. Set environment variables:
   ```bash
   export OPENAI_API_KEY="your-api-key"
   export AUTOGEN_SERVICE_URL="http://localhost:8000"
   ```

3. Start AutoGen Studio:
   ```bash
   python autogen_studio_setup.py
   ```

## 2. Workflow Prototyping

### Build Section:
1. **Create Agents**:
   - DocumentAnalyst (AssistantAgent)
   - QualityReviewer (AssistantAgent)  
   - UserProxy (UserProxyAgent)

2. **Configure System Messages**:
   - Use the provided templates in `autogen_workflows/`
   - Customize for your specific use case

3. **Set LLM Configuration**:
   - Model: gpt-4o
   - Temperature: 0.7 for analysis, 0.5 for review
   - Max tokens: 1000-1500

### Workflow Design:
1. **Sequential Flow**:
   User Question → Document Analysis → Quality Review → Final Response

2. **Test Different Patterns**:
   - Single agent responses
   - Multi-agent collaboration
   - Iterative refinement

## 3. Skill Integration

### Custom Skills Location:
- `autogen_skills/document_search.py`
- `autogen_skills/document_summary.py`

### Testing Skills:
1. Add skills in Studio's Build section
2. Test with sample documents
3. Verify integration with Pinecone service

## 4. Session Interaction Testing

### Playground Testing:
1. **Load Workflow**: Import your JSON configuration
2. **Start Session**: Begin conversation with UserProxy
3. **Test Scenarios**:
   - Simple document questions
   - Complex multi-part queries
   - Source citation requests
   - Error handling

### Test Cases:
1. **Document Analysis**:
   - "What are the key points in document X?"
   - "Compare information between documents A and B"
   - "Find specific data about topic Y"

2. **Quality Verification**:
   - Check response accuracy
   - Verify source citations
   - Test edge cases

## 5. Export and Integration

### Export Workflow:
1. Test successful workflow in Playground
2. Export as JSON from Build section
3. Save to `autogen_workflows/` directory

### Web App Integration:
1. Update `simple_multi_agent_system.py` with new workflows
2. Test API endpoints with exported configuration
3. Verify consistency between Studio and web app

## 6. Best Practices

### Agent Configuration:
- Keep system messages clear and specific
- Use appropriate temperature settings
- Set reasonable token limits

### Testing Strategy:
- Start with simple workflows
- Gradually add complexity
- Test error scenarios
- Validate with real documents

### Documentation:
- Document successful configurations
- Note any limitations or issues
- Keep workflow versions organized

## 7. Troubleshooting

### Common Issues:
- API key not set
- Port conflicts
- Model access issues
- Skill integration problems

### Debug Steps:
1. Check environment variables
2. Verify service connectivity
3. Review agent configurations
4. Test individual components
