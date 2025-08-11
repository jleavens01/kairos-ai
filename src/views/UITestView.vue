<template>
  <div class="container mx-auto p-8 space-y-8">
    <h1 class="text-3xl font-bold">UI 컴포넌트 테스트</h1>
    
    <!-- 버튼 섹션 -->
    <Card>
      <CardHeader>
        <CardTitle>버튼 컴포넌트</CardTitle>
        <CardDescription>다양한 스타일의 버튼들</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap gap-4">
          <Button>기본 버튼</Button>
          <Button variant="secondary">보조 버튼</Button>
          <Button variant="destructive">삭제 버튼</Button>
          <Button variant="outline">외곽선 버튼</Button>
          <Button variant="ghost">고스트 버튼</Button>
          <Button variant="link">링크 버튼</Button>
        </div>
        
        <div class="flex flex-wrap gap-4">
          <Button size="sm">작은 버튼</Button>
          <Button>기본 크기</Button>
          <Button size="lg">큰 버튼</Button>
          <Button size="icon">🔍</Button>
        </div>
        
        <div class="flex flex-wrap gap-4">
          <Button :loading="true">로딩 중...</Button>
          <Button :disabled="true">비활성화</Button>
        </div>
      </CardContent>
    </Card>
    
    <!-- 입력 필드 섹션 -->
    <Card>
      <CardHeader>
        <CardTitle>입력 컴포넌트</CardTitle>
        <CardDescription>폼 입력 필드들</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="name">이름</Label>
          <Input id="name" v-model="formData.name" placeholder="이름을 입력하세요" />
        </div>
        
        <div class="space-y-2">
          <Label for="email">이메일</Label>
          <Input id="email" v-model="formData.email" type="email" placeholder="email@example.com" />
        </div>
        
        <div class="space-y-2">
          <Label for="password">비밀번호</Label>
          <Input id="password" v-model="formData.password" type="password" placeholder="••••••••" />
        </div>
        
        <div class="space-y-2">
          <Label for="disabled">비활성화된 입력</Label>
          <Input id="disabled" :disabled="true" placeholder="비활성화됨" />
        </div>
      </CardContent>
    </Card>
    
    <!-- 뱃지 섹션 -->
    <Card>
      <CardHeader>
        <CardTitle>뱃지 컴포넌트</CardTitle>
        <CardDescription>상태 및 레이블 표시용 뱃지</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-4">
          <Badge>기본</Badge>
          <Badge variant="secondary">보조</Badge>
          <Badge variant="destructive">위험</Badge>
          <Badge variant="outline">외곽선</Badge>
        </div>
        
        <div class="flex flex-wrap gap-4 mt-4">
          <Badge>Free</Badge>
          <Badge variant="secondary">Basic</Badge>
          <Badge class="bg-blue-500 text-white">Pro</Badge>
          <Badge class="bg-purple-500 text-white">Enterprise</Badge>
        </div>
      </CardContent>
    </Card>
    
    <!-- 카드 섹션 -->
    <div class="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 카드</CardTitle>
          <CardDescription>프로젝트 정보를 표시하는 카드</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            이것은 카드 컨텐츠입니다. 여기에 프로젝트 정보나 다른 내용을 표시할 수 있습니다.
          </p>
        </CardContent>
        <CardFooter class="flex justify-between">
          <Button variant="outline">취소</Button>
          <Button>저장</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>통계 카드</CardTitle>
          <CardDescription>사용량 및 제한 정보</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">크레딧</span>
            <Badge>100 / 500</Badge>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">프로젝트</span>
            <Badge variant="secondary">3 / 10</Badge>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">저장 공간</span>
            <Badge variant="outline">250MB / 2GB</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- 폼 데이터 표시 -->
    <Card>
      <CardHeader>
        <CardTitle>폼 데이터</CardTitle>
        <CardDescription>입력된 데이터 확인</CardDescription>
      </CardHeader>
      <CardContent>
        <pre class="p-4 bg-muted rounded-md text-sm">{{ JSON.stringify(formData, null, 2) }}</pre>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Badge from '@/components/ui/Badge.vue'

// Card 컴포넌트들 가져오기
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card'

const formData = ref({
  name: '',
  email: '',
  password: ''
})
</script>