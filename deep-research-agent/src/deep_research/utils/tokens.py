"""Token counting utilities."""
import tiktoken

from ..models import SupportedModel


def count_tokens(text: str, model: str | None = None) -> int:
    """Count tokens in text."""
    model_str = model or SupportedModel.default().model_name
    try:
        encoding = tiktoken.encoding_for_model(model_str)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")

    return len(encoding.encode(text))
