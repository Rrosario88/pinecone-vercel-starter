# AutoGen Studio Testing Guide

## 🎯 Overview

This guide helps you set up AutoGen Studio for manual testing and workflow prototyping of your RAG document assistant. Use AutoGen Studio's low-code interface to build, test, and refine multi-agent workflows before deploying them in your web application.

## 🚀 Quick Start

### 1. Installation & Setup

```bash
# Navigate to python service directory
cd python-service

# Install dependencies (includes AutoGen Studio)
pip install -r requirements.txt

# Set required environment variables
export OPENAI_API_KEY="your-openai-api-key"
export AUTOGEN_SERVICE_URL="http://localhost:8000"

# Run the setup script
python autogen_studio_setup.py
```

### 2. Start AutoGen Studio

```bash
# Option 1: Using the setup script (recommended)
python autogen_studio_setup.py

# Option 2: Direct command
autogenstudio ui --port 8081
```

Access the UI at: **http://localhost:8081**

## 📋 Testing Workflow

### Phase 1: Workflow Prototyping

#### Build Section - Agent Configuration

1. **Create Core Agents**:

   **ResearcherAgent** (AssistantAgent):
   ```
   System Message: "You are a research specialist focused on document analysis. Use search tools to find relevant content, gather comprehensive information, verify sources, and prioritize relevant content. Always cite sources and provide confidence scores."
   
   Model: gpt-4o
   Temperature: 0.3
   Max Tokens: 1000
   Tools: search_documents, get_document_metadata
   ```

   **AnalystAgent** (AssistantAgent):
   ```
   System Message: "You are a document analysis expert. Process information from ResearcherAgent, create comprehensive responses, apply analytical reasoning, and present complex information clearly. Use proper formatting and citations."
   
   Model: gpt-4o
   Temperature: 0.7
   Max Tokens: 1500
   ```

   **ReviewerAgent** (AssistantAgent):
   ```
   System Message: "You are a quality assurance specialist. Verify accuracy, check completeness, validate citations, suggest improvements, and provide final polish. Only approve high-quality responses."
   
   Model: gpt-4o
   Temperature: 0.5
   Max Tokens: 800
   ```

   **UserProxy** (UserProxyAgent):
   ```
   Human Input Mode: ALWAYS
   Code Execution: False
   Max Auto Reply: 0
   ```

2. **Configure Group Chat**:
   - Max Rounds: 6
   - Speaker Selection: round_robin
   - Allow Repeat Speaker: false

#### Workflow Design Patterns

**Sequential Pattern** (Recommended):
```
User Question → Research → Analysis → Review → Final Answer
```

**Iterative Pattern**:
```
User Question → Research → Analysis → Review → Refinement → Final Answer
```

### Phase 2: Skill Integration

#### Available Custom Skills

1. **document_search.py**:
   - `search_documents(query, max_results, min_score)`
   - `get_document_metadata(document_name)`
   - `search_by_document(document_name, query, max_results)`

2. **document_summary.py**:
   - `summarize_document(document_name, max_length, summary_type)`
   - `get_document_stats(document_name)`

#### Testing Skills in Studio

1. Navigate to **Build > Skills**
2. Import custom skills from `autogen_skills/` directory
3. Test each skill individually in the Playground
4. Verify integration with your Pinecone service

### Phase 3: Session Interaction Testing

#### Playground Testing Scenarios

**Scenario 1: Simple Document Query**
```
Test Input: "What are the main findings in the research paper about AI?"
Expected Flow: Research → Analysis → Review → Response
Validation: Check source citations, accuracy, completeness
```

**Scenario 2: Cross-Document Analysis**
```
Test Input: "Compare the methodologies used in documents A and B"
Expected Flow: Multi-document search → Comparative analysis → Review
Validation: Verify both documents referenced, comparison accuracy
```

**Scenario 3: Specific Data Extraction**
```
Test Input: "What is the revenue growth mentioned in the Q3 financial report?"
Expected Flow: Targeted search → Data extraction → Verification
Validation: Precise data with source attribution
```

**Scenario 4: Complex Multi-Part Query**
```
Test Input: "Summarize the key risks mentioned across all uploaded documents and rank them by severity"
Expected Flow: Comprehensive search → Analysis → Ranking → Review
Validation: Complete coverage, logical ranking, proper citations
```

#### Error Handling Tests

1. **No Documents Available**:
   - Input: Any question when no documents uploaded
   - Expected: Graceful error message

2. **Ambiguous Query**:
   - Input: "Tell me about it"
   - Expected: Request for clarification

3. **No Relevant Content**:
   - Input: Question about unrelated topic
   - Expected: Clear indication of no relevant content found

## 🔧 Configuration Templates

### Workflow Configuration (JSON)

Use the pre-built configuration:
```bash
autogen_workflows/rag_assistant_workflow.json
```

Key settings to customize:
- Agent system messages
- Temperature settings
- Max tokens
- Tool assignments
- Termination conditions

### Environment Variables

```bash
# Required
OPENAI_API_KEY="your-api-key"

# Optional (defaults shown)
AUTOGEN_SERVICE_URL="http://localhost:8000"
AUTOGEN_STUDIO_PORT="8081"
```

## 📊 Testing Checklist

### ✅ Agent Configuration
- [ ] All agents have appropriate system messages
- [ ] LLM configurations are optimized
- [ ] Tools are properly assigned
- [ ] Group chat settings configured

### ✅ Workflow Functionality
- [ ] Agents communicate properly
- [ ] Information flows correctly between agents
- [ ] Termination conditions work
- [ ] Error handling is robust

### ✅ Skill Integration
- [ ] Custom skills load correctly
- [ ] Document search functions work
- [ ] Summary generation works
- [ ] Metadata retrieval works
- [ ] Service connectivity verified

### ✅ Response Quality
- [ ] Answers are accurate and complete
- [ ] Sources are properly cited
- [ ] Formatting is clean and readable
- [ ] Complex queries handled well
- [ ] Edge cases managed gracefully

## 🔄 Export and Integration

### Export Successful Workflows

1. **Test thoroughly** in Studio Playground
2. **Export configuration** as JSON from Build section
3. **Save to** `autogen_workflows/` directory
4. **Document any customizations** or special requirements

### Integrate with Web App

1. **Update** `simple_multi_agent_system.py` with new configurations
2. **Test API endpoints** with exported workflow
3. **Verify consistency** between Studio and web app behavior
4. **Deploy** tested configuration

## 🐛 Troubleshooting

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| API Key Missing | Authentication errors | Set `OPENAI_API_KEY` environment variable |
| Port Conflicts | Studio won't start | Use different port: `--port 8082` |
| Service Connection | Skills fail | Verify `AUTOGEN_SERVICE_URL` and service status |
| Agent Loops | Infinite conversations | Adjust termination conditions and max rounds |
| Poor Responses | Low quality answers | Tune temperature and system messages |

### Debug Steps

1. **Check Environment**:
   ```bash
   echo $OPENAI_API_KEY
   echo $AUTOGEN_SERVICE_URL
   curl $AUTOGEN_SERVICE_URL/health
   ```

2. **Verify Service Status**:
   ```bash
   # Check if your RAG service is running
   curl http://localhost:8000/health
   ```

3. **Test Skills Individually**:
   - Use Playground to test each skill
   - Check error messages in Studio logs
   - Verify network connectivity

4. **Review Agent Logs**:
   - Monitor conversation flow
   - Check for infinite loops
   - Validate tool executions

## 📈 Best Practices

### Agent Design
- **Clear roles**: Each agent should have a specific, well-defined purpose
- **Appropriate tools**: Only assign necessary tools to each agent
- **Balanced temperature**: Lower for research (0.3), higher for creativity (0.7)
- **Reasonable limits**: Set appropriate token limits for each agent's role

### Workflow Design
- **Start simple**: Begin with basic sequential workflows
- **Test incrementally**: Add complexity gradually
- **Document decisions**: Keep notes on what works and what doesn't
- **Version control**: Save working configurations with version numbers

### Testing Strategy
- **Use real data**: Test with actual documents you'll use in production
- **Edge cases**: Test with no documents, large documents, multiple documents
- **User scenarios**: Test realistic user questions and use cases
- **Performance**: Monitor response times and quality

## 📚 Advanced Features

### Custom Agent Types
- Experiment with different agent configurations
- Test specialized agents for specific document types
- Try different conversation patterns

### Advanced Skills
- Create domain-specific analysis tools
- Integrate with external APIs
- Add data visualization capabilities

### Workflow Optimization
- Tune agent parameters based on testing results
- Optimize conversation flow for efficiency
- Implement smart termination conditions

## 🎓 Learning Resources

- **AutoGen Documentation**: https://docs.microsoft.com/autogen
- **AutoGen Studio Guide**: Built-in help and tutorials
- **Multi-Agent Patterns**: Study successful workflow patterns
- **Community Examples**: Explore shared workflows and configurations

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review AutoGen Studio documentation
3. Test individual components
4. Check service logs and connectivity
5. Verify environment configuration

Remember: AutoGen Studio is your testing environment. Use it to experiment, prototype, and validate before deploying to production!