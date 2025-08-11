// Storage 버킷 초기화 유틸리티
import { supabase } from './supabase';

export const initRefImagesBucket = async () => {
  try {
    // 버킷 생성 API 호출
    const response = await fetch('/.netlify/functions/createRefImagesBucket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('ref-images 버킷 준비 완료:', result.message);
      return true;
    } else {
      console.error('버킷 생성 실패:', result.error);
      return false;
    }
  } catch (error) {
    console.error('버킷 초기화 오류:', error);
    return false;
  }
};

// 버킷이 존재하는지 확인
export const checkRefImagesBucket = async () => {
  try {
    const { data, error } = await supabase
      .storage
      .from('ref-images')
      .list('', { limit: 1 });
    
    if (error) {
      console.log('ref-images 버킷이 없습니다. 생성이 필요합니다.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('버킷 확인 오류:', error);
    return false;
  }
};