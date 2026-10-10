"""Extract verbatim source excerpts from the project repos into assets/data/snippets.json.
Run from a folder containing clones of the repos (default ../ref relative to this repo)."""
import json, re, sys, os
REF = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', '..', 'ref')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'data', 'snippets.json')
GH = 'https://github.com/deadven7/'

def text(repo, f):
    p = os.path.join(REF, repo, f)
    if f.endswith('.ipynb'):
        nb = json.load(open(p))
        return '\n'.join(''.join(c['source']) for c in nb['cells'] if c['cell_type'] == 'code')
    return open(p, encoding='utf-8', errors='ignore').read()

def func(src, name):
    lines = src.split('\n')
    for i, l in enumerate(lines):
        m = re.match(r'^(\s*)(def|class) ' + re.escape(name) + r'\b', l)
        if m:
            ind = len(m.group(1)); out = [l]
            for l2 in lines[i + 1:]:
                if l2.strip() and (len(l2) - len(l2.lstrip())) <= ind and not l2.lstrip().startswith(('#', ')', ']', '}')):
                    break
                out.append(l2)
            while out and not out[-1].strip(): out.pop()
            return out
    raise SystemExit(f'func {name} not found')

def rng(src, start, end=None, n=None, include_end=False):
    lines = src.split('\n')
    i = next(k for k, l in enumerate(lines) if re.search(start, l))
    if n: return lines[i:i + n]
    j = next(k for k in range(i + 1, len(lines)) if re.search(end, lines[k]))
    return lines[i:j + (1 if include_end else 0)]

def dedent(ls):
    ind = min((len(l) - len(l.lstrip()) for l in ls if l.strip()), default=0)
    return '\n'.join(l[ind:] for l in ls).rstrip()

def trim(ls, keep):  # keep only first `keep` lines, append ellipsis comment
    return ls if len(ls) <= keep else ls[:keep] + [' ' * (len(ls[keep - 1]) - len(ls[keep - 1].lstrip())) + '# … (trimmed)']

S = {}
def add(slug, key, repo, f, lines, title, lang='python', keep=60):
    S.setdefault(slug, {})[key] = {'file': f, 'title': title, 'lang': lang, 'url': GH + repo + '/blob/HEAD/' + f.replace(' ', '%20'), 'code': dedent(trim(lines, keep))}

# ---------------- stockbroker ----------------
R, F = 'stockbroker-assistant', 'Professional_Stockbroker_Assistant.ipynb'; t = text(R, F)
add('stockbroker', 'rsi', R, F, func(t, 'calculate_rsi'), 'calculate_rsi()')
add('stockbroker', 'macd', R, F, func(t, 'calculate_macd'), 'calculate_macd()')
add('stockbroker', 'bb', R, F, func(t, 'calculate_bollinger_bands'), 'calculate_bollinger_bands()')
add('stockbroker', 'features', R, F, rng(t, r"# Price-based indicators", r"# Support/Resistance levels"), 'FeatureEngineer.create_technical_features()')
add('stockbroker', 'regime', R, F, rng(t, r"# Standardize features", r"# Add regime labels back"), 'FeatureEngineer.detect_market_regimes()')
add('stockbroker', 'trend', R, F, func(t, '_trend_forecast_realistic'), 'Forecaster._trend_forecast_realistic()', keep=34)
add('stockbroker', 'mr', R, F, func(t, '_mean_reversion_forecast'), 'Forecaster._mean_reversion_forecast()')
add('stockbroker', 'es', R, F, func(t, '_exp_smoothing_forecast_enhanced'), 'Forecaster._exp_smoothing_forecast_enhanced()')
add('stockbroker', 'ma', R, F, func(t, '_ma_forecast_enhanced'), 'Forecaster._ma_forecast_enhanced()')
add('stockbroker', 'arima', R, F, func(t, '_arima_forecast_safe'), 'Forecaster._arima_forecast_safe()')
add('stockbroker', 'ens', R, F, func(t, '_create_ensemble_forecast'), 'Forecaster._create_ensemble_forecast()', keep=34)
add('stockbroker', 'mlfeat', R, F, rng(t, r"feature_cols = \[", r"# Filter available features"), 'MLPredictor.prepare_ml_data()')
add('stockbroker', 'rf', R, F, rng(t, r"# Time series split \(respects temporal order\)", r"# Calculate performance metrics"), 'MLPredictor.train_models()', keep=45)
add('stockbroker', 'opt', R, F, rng(t, r"# Objective function: negative Sharpe ratio", r"# Multiple optimization attempts"), 'PortfolioOptimizer._scipy_optimization_enhanced()')
add('stockbroker', 'why', R, F, rng(t, r"# Individual asset reasoning", r"# ML prediction insights"), 'PortfolioOptimizer._generate_allocation_reasoning()')
add('stockbroker', 'rlparams', R, F, rng(t, r"strategy_params = \{", r"params = strategy_params.get"), 'RLTrader.simulate_trading() — policies')
add('stockbroker', 'rllogic', R, F, rng(t, r"# Buy conditions", r"actions.append\(action\)"), 'RLTrader.simulate_trading() — decisions', keep=70)
add('stockbroker', 'scen', R, F, rng(t, r"scenarios = \{", r"for scenario_name, scenario_params in scenarios.items"), 'StressTester.run_stress_tests() — scenarios')
add('stockbroker', 'stress', R, F, rng(t, r"# Apply stress scenario", r"scenario_results\[ticker\] = \{"), 'StressTester.run_stress_tests() — maths')
add('stockbroker', 'impact', R, F, func(t, '_assess_scenario_impact'), 'StressTester._assess_scenario_impact()')
add('stockbroker', 'advice', R, F, rng(t, r"# Final recommendation logic based on signal scores", r"# Ensure we have at least some reasoning"), 'BrokerAdvisor.generate_advice()')

# ---------------- optimizers ----------------
R = 'optimizer-role-nn'
add('optimizers', 'net', R, 'comparison.py', func(text(R, 'comparison.py'), 'Net'), 'class Net (LeNet-5 style)')
add('optimizers', 'opts', R, 'comparison.py', rng(text(R, 'comparison.py'), r"optimizers = \[", r"train_accs, test_accs"), 'main() — the three optimizers')
add('optimizers', 'train', R, 'sgd_class.py', func(text(R, 'sgd_class.py'), 'train'), 'SGD_TrainTest.train()')
add('optimizers', 'ada', R, 'adagrad_class.py', rng(text(R, 'adagrad_class.py'), r"def __init__", r"self.train_loss = \[\]"), 'ADA_TrainTest.__init__()')

# ---------------- recommender ----------------
R = 'generic-clustering-system'; F = 'Data Mining Final Project - Netflix Data FInal.ipynb'; t = text(R, F)
add('recommender', 'combine', R, F, rng(t, r"full_data\['Clustering Attributes'\] = \(full_data", r"^$", n=2), 'Combining clustering attributes')
add('recommender', 'clean', R, F, func(t, 'stopwords') + [''] + func(t, 'remove_punctuation'), 'Removing stopwords & punctuation')
add('recommender', 'cv', R, F, rng(t, r"^CV = CountVectorizer", r"cosine_similarity = cosine_similarity", include_end=True) + [''] + func(t, 'recommendation'), 'CountVectorizer + cosine recommender')
add('recommender', 'tfidf', R, F, rng(t, r"def identity_tokenizer", r"X.shape"), 'TF-IDF vectorisation')
add('recommender', 'kmeans', R, F, rng(t, r"# Elbow method to find", r"fig = px.line") + ['…'] + rng(t, r"kmeans = KMeans\(n_clusters=5", r"kmeans.fit", include_end=True), 'Elbow method + K-Means (k = 5)')
add('recommender', 'graph', R, F, rng(t, r"for i, row in full_data.iterrows\(\):", r"# Building the graph"), 'NetworkX similarity graph', keep=24)
F = 'Data Mining Final Project - College Data Final.ipynb'; t = text(R, F)
add('recommender', 'ratios', R, F, rng(t, r"# Column 1 - ratio", r"# Converting public/private"), 'College feature engineering')
add('recommender', 'ckm', R, F, rng(t, r"scaler = StandardScaler\(\)", r"clustering_data\[columns_data\] = scaler", include_end=True) + [''] + rng(t, r"kmeans = KMeans\(n_clusters=4", r"kmeans.fit", include_end=True), 'Scaling + K-Means (k = 4)')
add('recommender', 'chc', R, F, rng(t, r"hierarchical = AgglomerativeClustering", r"hierarchical.fit_predict", include_end=True), 'Agglomerative (Ward, 7 clusters)')

# ---------------- snp500 ----------------
R = 'snp500-analysis-forecasting'; F = 'PFizer_Analysis.Rmd'; t = text(R, F)
add('snp500', 'ts', R, F, rng(t, r"PFizer_time <-ts", r"^```", n=1) + rng(t, r"^adf.test", r"^```", n=1), 'Time series + ADF test', 'r')
add('snp500', 'arima', R, F, rng(t, r"fit_arima<-auto.arima", r"^```", n=1) + rng(t, r"fcst<-forecast", r"^```", n=1) + rng(t, r"Box.test", r"^```", n=1), 'auto.arima → forecast → Ljung–Box', 'r')
add('snp500', 'logdiff', R, F, rng(t, r"plot\(10\*diff\(log", r"^```", n=1), 'Log-differenced returns', 'r')
add('snp500', 'monthly', R, F, rng(t, r"PFizer_month <- PFizer %>%", r"^```"), 'Monthly totals by year', 'r')
F = 'Sector Analysis.Rmd'; t = text(R, F)
add('snp500', 'sector', R, F, rng(t, r"health_care\$Date <- as.POSIXct", r"data_health_care_2019"), 'Sector preprocessing (health care)', 'r')

# ---------------- attrition ----------------
R = 'credit-approval-prediction'; F = 'Stat Modeling - Final project.Rmd'; t = text(R, F)
add('attrition', 'label', R, F, rng(t, r'cdata\$Attrition_Flag= ifelse', r"^```"), 'Encoding the label', 'r')
add('attrition', 'glm', R, F, rng(t, r"data1 = cdata %>% select", r"^```", n=1) + rng(t, r"trainIndex <- createDataPartition", r"^```") + rng(t, r"model <- glm", r"^```") + rng(t, r"prob=predict\(model", r"^```"), 'Logistic regression (glm) with 0.2 threshold', 'r')
add('attrition', 'ridge', R, F, rng(t, r"set.seed\(123\)", r"^```") + rng(t, r"# Fit a ridge regression", r"ridge_acc <-", include_end=True), 'Ridge (cv.glmnet, α = 0)', 'r')
add('attrition', 'lasso', R, F, rng(t, r"# Fit a lasso regression", r"lasso_acc <-", include_end=True), 'Lasso (cv.glmnet, α = 1)', 'r')

# ---------------- ghigliottina ----------------
R = 'la_ghigliottina'; F = 'Team16_baseline.ipynb'; t = text(R, F)
add('ghigliottina', 'w2v', R, F, func(t, 'tokenizer') + [''] + rng(t, r"tokenized_data_target =", r"w2v_model = Word2Vec", include_end=True), 'Skip-gram Word2Vec')
add('ghigliottina', 'common', R, F, func(t, 'common_words'), 'common_words() — the solver')
F = 'statistical-software-team-16-nn.ipynb'; t = text(R, F)
add('ghigliottina', 'lstm', R, F, rng(t, r"^model = Sequential\(\)", r"epochs=3\)", include_end=True), 'LSTM over Word2Vec embeddings')
F = 'Team16_BART.ipynb'; t = text(R, F)
add('ghigliottina', 'bart', R, F, rng(t, r"model_id = 'facebook/bart-base'", r"metric = load_metric", include_end=True) + [''] + rng(t, r"args = Seq2SeqTrainingArguments", r"save_total_limit", include_end=True), 'Fine-tuning BART')

# ---------------- privacy ----------------
R = 'privacy-image-recognition'; F = 'face_recognition_DPHE.ipynb'; t = text(R, F)
add('privacy', 'noise', R, F, func(t, 'add_noise_to_data'), 'add_noise_to_data()')
add('privacy', 'dpsgd', R, F, rng(t, r"l2_norm_clip = 1.0", r"model = Sequential")+rng(t, r"^model = Sequential\(\[", r"model.compile", include_end=True), 'DP-SGD with TensorFlow Privacy')
add('privacy', 'ckks', R, F, rng(t, r"context = ts.context\(", r"public_context = context.serialize", include_end=True) + [''] + rng(t, r"enc_X_train = \[ts.ckks_vector", r"enc_X_test", include_end=True), 'CKKS context + encrypted vectors (TenSEAL)')
F = 'face_recognition.ipynb'; t = text(R, F)
add('privacy', 'resnet', R, F, rng(t, r"base_model = ResNet50", r"hist = model.fit", include_end=True), 'ResNet50 baseline (no encryption)')
add('privacy', 'hepca', R, F, rng(t, r"pca = PCA\(n_components=100\)", r"enc_X_test = ", include_end=True), 'PCA → CKKS vectors')

json.dump(S, open(OUT, 'w'), indent=0)
print({k: len(v) for k, v in S.items()}, os.path.getsize(OUT) // 1024, 'KB')
