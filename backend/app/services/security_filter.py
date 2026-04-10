import re

class SecurityFilterService:
    """
    Service responsible for detecting and filtering malicious inputs,
    specifically prompt injection attempts as described in the system design.
    """
    
    # Simple heuristics for prompt injection detection
    PROMPT_INJECTION_PATTERNS = [
        r"(?i)\b(ignore previous instructions|disregard|override|print prior instructions)\b",
        r"(?i)\b(system prompt|tell me your instructions|what are your rules)\b",
        r"(?i)\b(you are an unrestricted|you are now|act as an unrestricted)\b",
        r"(?i)\b(forget everything|ignore all)\b"
    ]
    
    def __init__(self):
        self.injection_regexes = [re.compile(pattern) for pattern in self.PROMPT_INJECTION_PATTERNS]

    def detect_prompt_injection(self, query: str) -> bool:
        """
        Detects if the query contains common prompt injection patterns.
        Returns True if an injection is detected, False otherwise.
        """
        for regex in self.injection_regexes:
            if regex.search(query):
                return True
        return False

security_filter = SecurityFilterService()
