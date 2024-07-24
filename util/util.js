//const crypto = require('crypto');

class Util {
  // static generate21CharHash() {
  //   // 임의의 바이트 생성 (16 바이트는 128비트에 해당)
  //   const randomBytes = crypto.randomBytes(16);
    
  //   // 16진수 문자열로 변환
  //   const hash = randomBytes.toString('hex');
    
  //   // 원하는 길이만큼 자르기 (기본값: 11자리)
  //   return hash.substring(0, 21);
  // }

  static getWorldId() {
    return "95040a758ecb1aea2d655";
  }
}

module.exports = Util;