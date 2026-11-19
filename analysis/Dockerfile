FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && python -m spacy download es_core_news_sm \
 && python -c "from huggingface_hub import hf_hub_download; hf_hub_download('roshan-research/hazm-postagger', 'pos_tagger.model', local_dir='/models')" || true
ENV HAZM_POS_MODEL=/models/pos_tagger.model
COPY analyzers.py conjugation.py app.py ./
# Train the conjugator's model for unknown verbs now, so the first request is not slow.
RUN python -c "from conjugation import conjugate; conjugate('hablar', '')"
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
