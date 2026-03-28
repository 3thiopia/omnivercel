import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, Mail, Info, AlertTriangle, FileText, CheckCircle2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';

export const StaticPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const getContent = () => {
    switch (slug) {
      case 'about-us':
        return {
          title: 'About OmniMarket',
          icon: <Info className="w-12 h-12 text-emerald-500" />,
          content: (
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                OmniMarket is Ethiopia's fastest-growing online marketplace. Our mission is to connect buyers and sellers across the country in a safe, simple, and efficient way.
              </p>
              <h3 className="text-xl font-bold text-gray-900">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                We believe in the power of local commerce. By providing a modern platform for Ethiopians to trade, we're helping small businesses grow and individuals find exactly what they need at the best prices.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-emerald-50 p-4 rounded-2xl">
                  <p className="text-emerald-600 font-black text-2xl">0%</p>
                  <p className="text-emerald-800 text-xs font-bold uppercase">Commission</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl">
                  <p className="text-blue-600 font-black text-2xl">100%</p>
                  <p className="text-blue-800 text-xs font-bold uppercase">Local</p>
                </div>
              </div>

              {/* Competitive Edge Section - Moved from Homepage */}
              <div className="mt-12 pt-12 border-t border-gray-100">
                <div className="bg-emerald-900 text-white rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-32 -mb-32" />
                  
                  <div className="relative z-10">
                    <div className="text-center mb-10">
                      <h2 className="text-2xl sm:text-3xl font-black mb-4 tracking-tight">OmniMarket vs Jiji Ethiopia</h2>
                      <p className="text-emerald-100 text-sm font-medium opacity-80">Why smart shoppers are switching to OmniMarket.</p>
                    </div>

                    <div className="grid gap-6">
                      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          The OmniMarket Advantage
                        </h3>
                        <ul className="space-y-3">
                          {[
                            "0% commission - Keep all your profits",
                            "Instant real-time chat with buyers",
                            "Verified local sellers in your neighborhood",
                            "Modern, fast, and mobile-first experience",
                            "Advanced SEO to help your ads rank on Google"
                          ].map((point, i) => (
                            <li key={i} className="flex items-start gap-3 text-emerald-50 text-xs font-medium">
                              <div className="w-1 h-1 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 opacity-80">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                          <X className="w-6 h-6 text-red-400" />
                          Jiji Ethiopia Limitations
                        </h3>
                        <ul className="space-y-3">
                          {[
                            "Complex and cluttered interface",
                            "Slower loading times on mobile networks",
                            "Often filled with duplicate or outdated ads",
                            "Less focus on local SEO for specific products",
                            "Higher barrier for new sellers to get noticed"
                          ].map((point, i) => (
                            <li key={i} className="flex items-start gap-3 text-emerald-100/60 text-xs font-medium">
                              <div className="w-1 h-1 bg-red-400/50 rounded-full mt-1.5 shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-10 text-center">
                      <button 
                        onClick={() => navigate('/')}
                        className="bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all shadow-xl active:scale-95"
                      >
                        Start Selling Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        };
      case 'contact-support':
        return {
          title: 'Contact Support',
          icon: <Mail className="w-12 h-12 text-blue-500" />,
          content: (
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                Need help? Our support team is here for you. Whether you have a question about your account or need help with a listing, we're just a message away.
              </p>
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Mail className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Us</p>
                    <p className="text-gray-900 font-bold">support@omnimarket.et</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Response Time</p>
                    <p className="text-gray-900 font-bold">Within 24 hours</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 italic">
                Tip: Check our Safety Tips before making any transactions.
              </p>
            </div>
          )
        };
      case 'safety-tips':
        return {
          title: 'Safety Tips',
          icon: <ShieldCheck className="w-12 h-12 text-emerald-500" />,
          content: (
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                Your safety is our priority. Follow these simple guidelines to ensure a secure trading experience on OmniMarket.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Meet in Public', desc: 'Always meet the seller in a well-lit, public place like a coffee shop or mall.' },
                  { title: 'Inspect the Item', desc: 'Check the product thoroughly before making any payment.' },
                  { title: 'No Upfront Payments', desc: 'Never send money before seeing and receiving the item.' },
                  { title: 'Trust Your Gut', desc: 'If a deal seems too good to be true, it probably is.' }
                ].map((tip, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{tip.title}</h4>
                      <p className="text-xs text-gray-500">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        };
      case 'terms-of-service':
        return {
          title: 'Terms of Service',
          icon: <FileText className="w-12 h-12 text-gray-500" />,
          content: (
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                By using OmniMarket, you agree to our terms and conditions. We aim to keep our platform fair and safe for everyone.
              </p>
              <div className="prose prose-sm text-gray-600 max-w-none">
                <h4 className="font-bold text-gray-900">1. User Responsibility</h4>
                <p>Users are responsible for the content they post and the transactions they make.</p>
                <h4 className="font-bold text-gray-900">2. Prohibited Items</h4>
                <p>Selling illegal goods, stolen property, or harmful substances is strictly prohibited.</p>
                <h4 className="font-bold text-gray-900">3. Account Security</h4>
                <p>Keep your login credentials safe. You are responsible for all activity on your account.</p>
              </div>
            </div>
          )
        };
      default:
        return {
          title: 'Page Not Found',
          icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
          content: <p className="text-gray-600">The page you are looking for does not exist.</p>
        };
    }
  };

  const { title, icon, content } = getContent();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-8 sm:p-12 border border-gray-100 shadow-sm"
        >
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center">
              {icon}
            </div>
          </div>
          
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{title}</h2>
            <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full" />
          </div>

          {content}
        </motion.div>
      </div>
    </div>
  );
};
