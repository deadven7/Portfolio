/* ------------------------------------------------------------------
   SITE CONTENT — edit this file to update the portfolio.
   Everything on the site (links, work, projects, certs) reads from here.
------------------------------------------------------------------- */
window.SITE = {
  name: 'Amaan Vora',
  email: 'amaan.vora.e@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/amaan-vora/',
    github: 'https://github.com/deadven7',
    kaggle: 'https://www.kaggle.com/amaanvora',
    mail: 'mailto:amaan.vora.e@gmail.com',
  },

  hero: {
    // typed in the terminal before the headline
    prelude: ['whoami', 'cat ./mission.txt'],
    headline: ['Turning noise', 'into signal.'],
    sub: 'Data scientist & ML engineer. I build models that explain themselves — and interfaces that let you poke at them.',
  },

  aboutShort:
    "I'm Amaan — a data scientist trained in statistics (M.S., Rutgers) and computer science (B.Tech, SRM). " +
    "I've clustered 100k+ customer comments with Sentence-BERT at Siemens, tuned random forests for causal-inference research at Rutgers, " +
    "and led the front-end rebuild of The Daily Targum's AWS-backed site. Off the clock: chess, guitar, tennis, comic books and too many side projects.",

  /* Horizontal timeline on the home page (oldest → newest) */
  work: [
    {
      org: 'Kaiser Pharmaceuticals',
      role: 'Freelance Web Developer',
      dates: 'Sep – Dec 2020',
      logo: 'assets/logos/kaiser.png',
      blurb: 'Sole developer of two product-catalogue sites for a pharma export and packaging business (Kaiser Pharma, Aura Packaging).',
    },
    {
      org: 'Siemens Limited',
      role: 'GBS Intern · ML Team',
      dates: 'Jun – Aug 2021',
      logo: 'assets/logos/siemens.png',
      blurb: 'Sentence-BERT clustering of 100k+ customer comments (0.89 accuracy) and a bash RC automation system over 5,000+ driver files.',
    },
    {
      org: 'Rutgers University',
      role: 'Graduate Research Assistant · Statistics',
      dates: 'Jan – Jul 2023',
      logo: 'assets/logos/rutgers.png',
      blurb: 'Random-forest tuning with hat-matrix curvature identification for causal-inference research; ported R → Stata with a 15% lift.',
    },
    {
      org: 'The Daily Targum',
      role: 'Lead Front-End Developer',
      dates: 'Aug 2023 –',
      logo: 'assets/logos/targum.png',
      blurb: 'Rebuilt the paper’s AWS + DynamoDB site: 50% lower maintenance, ~50% more traffic, 25% lower monthly spend.',
    },
  ],

  /* Main certifications only (individual course certificates are folded into their parent) */
  certs: [
    { name: 'Google Data Analytics Professional Certificate', img: 'assets/certs/google-data-analytics.jpg' },
    { name: 'Machine Learning Specialization — University of Washington', img: 'assets/certs/uw-machine-learning.jpg' },
    { name: 'NVIDIA DLI — Fundamentals of Deep Learning', img: 'assets/certs/nvidia-dli.jpg' },
    { name: 'Kaggle — Python, Data Science, Data Cleaning, Visualization, ML, AI', img: 'assets/certs/kaggle.jpg' },
    { name: 'Certified Ethical Hacking Expert (L1) — TechDefence', img: 'assets/certs/ethical-hacking.jpg' },
  ],

  featured: ['stockbroker', 'optimizers', 'recommender'],

  projects: [
    {
      slug: 'stockbroker',
      title: 'Professional Stockbroker Assistant',
      year: 2025,
      cat: ['ml', 'ts'],
      tagline: 'An explainable quant engine: forecasting, ML signals, portfolio optimisation, an RL-style trading sandbox and stress tests.',
      stack: ['Python', 'pandas', 'scikit-learn', 'pmdarima', 'LightGBM', 'cvxpy', 'Plotly', 'Gradio'],
      repo: 'https://github.com/deadven7/stockbroker-assistant',
      live: 'https://huggingface.co/spaces/deadven7/stockbroker-assist',
      metrics: [['5', 'forecast methods, ensembled'], ['5', 'stress scenarios'], ['3', 'trading policies']],
      summary: [
        'Most “AI trading” demos are UI-led and opaque. This one is math-first: every block — features, forecasts, allocations, scenario impacts — is transparent and independently testable, so you can read why the system says what it says.',
        'The lab below re-implements the core of the engine in your browser on 2019–2022 daily data for five healthcare large-caps (the same universe as my S&P 500 study). The full Python version pulls live data via yfinance and runs on Hugging Face.',
      ],
      pipeline: ['Ingest OHLCV, align & fill', 'RSI · MACD · Bollinger · ROC · volatility', 'Trend / mean-reversion / Holt / momentum ensemble', 'Max-Sharpe portfolio search', 'Rule-based RL sandbox', 'Shock μ and σ, recompute risk'],
      demo: 'stockbroker',
    },
    {
      slug: 'optimizers',
      title: 'The Role of Optimizers in Neural Networks',
      year: 2023,
      cat: ['dl'],
      tagline: 'SGD vs AdaGrad vs RMSprop on LeNet-5 / MNIST — race them on loss landscapes and watch them train the same net.',
      stack: ['PyTorch', 'LeNet-5', 'MNIST', 'matplotlib'],
      repo: 'https://github.com/deadven7/optimizer-role-nn',
      metrics: [['99.10%', 'AdaGrad test accuracy'], ['98.89%', 'SGD + momentum'], ['94.78%', 'RMSprop @ lr 0.01']],
      summary: [
        'Same architecture, same data, same seed — only the optimizer changes. I trained a LeNet-style CNN on MNIST for 10 epochs with SGD (momentum 0.5), AdaGrad and RMSprop at the same learning rate (0.01) and compared loss trajectories and test accuracy. AdaGrad converged fastest and finished highest (99.10%); RMSprop struggled at that learning rate.',
        'The lab replays the real training logs from the notebook, then lets you race the same update rules on 2-D loss surfaces and on a small network that trains live in your browser.',
      ],
      pipeline: ['Normalise MNIST', 'LeNet-5: 2 conv + 2 FC', 'Train ×3 optimizers', 'Track loss / accuracy / time', 'Compare convergence'],
      demo: 'optimizers',
    },
    {
      slug: 'recommender',
      title: 'Generic Clustering & Recommender System',
      year: 2023,
      cat: ['ml', 'nlp'],
      tagline: 'One pipeline, two very different datasets: a Netflix recommender (7,787 titles) and K-Means/Ward clustering of 777 US colleges.',
      stack: ['Python', 'scikit-learn', 'NLTK', 'K-Means', 'Agglomerative', 'NetworkX'],
      repo: 'https://github.com/deadven7/generic-clustering-system',
      metrics: [['7,787', 'titles indexed'], ['k = 5', 'Netflix clusters'], ['777', 'colleges clustered']],
      summary: [
        'The goal was a pipeline that works on “any formatted data”: text-heavy catalogues (Netflix) and purely numeric tables (US college statistics) go through the same preprocess → vectorise → cluster → recommend flow.',
        'The lab runs both notebooks in your browser: the Netflix CountVectorizer recommender (it reproduces the notebook’s recorded outputs exactly), the NetworkX similarity graph, and the college feature engineering, K-Means and Ward clustering.',
      ],
      pipeline: ['Combine director, cast, genre, description', 'Strip non-ASCII, stopwords, punctuation', 'CountVectorizer → cosine similarity', 'TF-IDF → elbow → K-Means (k = 5)', 'College ratios → scale → K-Means + Ward'],
      demo: 'recommender',
    },
    {
      slug: 'snp500',
      title: 'S&P 500: Sector Shocks & Forecasting',
      year: 2023,
      cat: ['ts'],
      tagline: 'How COVID, war and politics moved the 11 sectors of the index (2019–2022), and an ARIMA forecast for Pfizer.',
      stack: ['R', 'tidyverse', 'ggplot2', 'forecast (auto.arima)', 'ADF / Ljung–Box'],
      repo: 'https://github.com/deadven7/snp500-analysis-forecasting',
      metrics: [['11', 'sectors'], ['946', 'Pfizer closes'], ['ARIMA(1,1,0)', 'chosen by auto.arima']],
      summary: [
        'We normalised every constituent, averaged within sectors and lined the curves up against world events. Healthcare rallied through the pandemic; energy whipsawed with geopolitics.',
        'For Pfizer, stationarity was checked with an Augmented Dickey–Fuller test, auto.arima picked ARIMA(1,1,0) by AIC, and a Ljung–Box test confirmed the residuals were white noise. The lab ports the ADF test, a stepwise auto.arima search, the 95% forecast and residual diagnostics from R to JavaScript.',
      ],
      pipeline: ['Filter 2019+ and min-max normalise', 'Sector means → event study', 'Pfizer: yearly / monthly EDA', 'ts() → adf.test()', 'auto.arima(ic = "aic") → forecast(h = 5)', 'Box.test(lag = 5, Ljung-Box)'],
      demo: 'snp500',
    },
    {
      slug: 'attrition',
      title: 'Credit Card Attrition: Logistic vs Ridge vs Lasso',
      year: 2023,
      cat: ['ml'],
      tagline: 'Which customers leave? Three regularised models on 10,127 bank customers — tweak a customer and see the risk move.',
      stack: ['R', 'glmnet', 'caret', 'pROC', 'ggplot2'],
      repo: 'https://github.com/deadven7/credit-approval-prediction',
      metrics: [['10,127', 'customers'], ['0.924', 'lasso / ridge test AUC'], ['76.1%', 'glm recall at a 0.2 threshold']],
      summary: [
        'A statistical-modelling study comparing plain logistic regression with ridge and lasso penalties, judged on accuracy, sensitivity, specificity and AUC. Lasso matched the others while zeroing out uninformative variables.',
        'The lab refits all three exactly as the Rmd specifies (glm on the de-correlated feature set with a 0.2 threshold; cv.glmnet ridge and lasso on 14 numeric predictors) and runs them in the page: confusion matrices, ROC curves, the coefficient table and a customer you can edit.',
      ],
      pipeline: ['Encode attrition as the label', 'EDA by contacts, inactivity, products', 'Drop correlated predictors', 'glm (75/25, threshold 0.2)', 'cv.glmnet ridge & lasso (70/30)', 'Confusion matrix · ROC · accuracy'],
      demo: 'attrition',
    },
    {
      slug: 'ghigliottina',
      title: 'Solving La Ghigliottina with NLP',
      year: 2024,
      cat: ['nlp'],
      tagline: 'Five clues, one hidden word. Word2Vec, LSTM, T5 and BART take on an Italian TV word-association game.',
      stack: ['PyTorch', 'TensorFlow', 'Skip-Gram', 'LSTM', 'T5', 'BART', 'NLTK'],
      repo: 'https://github.com/deadven7/la_ghigliottina',
      metrics: [['4', 'model families'], ['~39k', 'curated clue sets'], ['T5 / BART', 'strongest']],
      summary: [
        'In the show, a contestant sees five words and must find the one word linking them all. We built clue–answer datasets across films, people, places, food, sport and more, then compared Skip-Gram, LSTM, T5 and BART. The sequence-to-sequence transformers produced the most accurate associations.',
        'In the lab you play against the project’s Skip-Gram baseline, a Word2Vec model trained on the repo’s clue data with the notebook’s common_words() solver. It re-ranks its guesses as each clue arrives. Next to it are the LSTM and BART results recorded in the notebooks.',
      ],
      pipeline: ['Curate clue sets', 'Tokenise & embed', 'Skip-Gram / LSTM baselines', 'Fine-tune T5 & BART', 'Precision / recall / F1'],
      demo: 'ghigliottina',
    },
    {
      slug: 'privacy',
      title: 'Privacy-Preserving Facial Recognition',
      year: 2024,
      cat: ['dl'],
      tagline: 'Differential privacy and homomorphic encryption on Labeled Faces in the Wild — recognition without exposing the face.',
      stack: ['Python', 'TensorFlow', 'TensorFlow Privacy', 'TenSEAL (CKKS)', 'ResNet50', 'LFW'],
      repo: 'https://github.com/deadven7/privacy-image-recognition',
      metrics: [['LFW', 'faces benchmark'], ['CKKS', 'via TenSEAL (N = 16384)'], ['DP-SGD', 'clip 1.0 · noise 0.8']],
      summary: [
        'Biometric data is the one password you can’t rotate. We explored two complementary defences: differential privacy (calibrated noise so no single face changes the outcome much) and homomorphic encryption (compute on encrypted features without decrypting them).',
        'The lab ports the notebook’s pixel-noise function and DP-SGD clipping, implements a small working CKKS scheme (the one TenSEAL uses) so you can watch a server compute on encrypted face features, and replays the accuracy curves the notebooks recorded.',
      ],
      pipeline: ['fetch_lfw_people', 'Gaussian pixel noise', 'DP-SGD (DPKerasAdamOptimizer)', 'PCA(100) → CKKS vectors', 'ResNet50 baseline for comparison'],
      demo: 'privacy',
    },
  ],

  categories: { all: 'All', ml: 'Machine learning', dl: 'Deep learning', nlp: 'NLP', ts: 'Time series' },
};
